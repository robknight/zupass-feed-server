import { EdDSAPCDPackage } from "@pcd/eddsa-pcd";
import {
  EdDSATicketPCD,
  EdDSATicketPCDPackage,
  TicketCategory
} from "@pcd/eddsa-ticket-pcd";
import { EmailPCD, EmailPCDPackage } from "@pcd/email-pcd";
import {
  FeedHost,
  PollFeedResponseValue,
  verifyFeedCredential
} from "@pcd/passport-interface";
import {
  PCDActionType,
  PCDPermissionType,
  ReplaceInFolderAction,
  ReplaceInFolderPermission
} from "@pcd/pcd-collection";
import { ArgumentTypeName, SerializedPCD } from "@pcd/pcd-types";
import {
  SemaphoreSignaturePCD,
  SemaphoreSignaturePCDPackage
} from "@pcd/semaphore-signature-pcd";
import _ from "lodash";
import path from "path";
import { v4 as uuid } from "uuid";
import { ZUPASS_PUBLIC_KEY } from "./main";

const fullPath = path.join(__dirname, "../artifacts/");
SemaphoreSignaturePCDPackage.init?.({
  zkeyFilePath: fullPath + "16.zkey",
  wasmFilePath: fullPath + "16.wasm"
});

EdDSAPCDPackage.init?.({});
EdDSATicketPCDPackage.init?.({});

const EVENT_ID = "32cb7908-aad7-4ee4-8eb7-49227f4b28e7";
const REGULAR_PRODUCT_ID = "39ed8025-2980-4bfb-ae18-6a1b0970d5f4";
const DAYPASS_PRODUCT_ID = "2c1c5aea-67be-4b54-87ab-427275e46c37";

interface PollFeedRequest {
  feedId: string;
  pcd?: SerializedPCD<SemaphoreSignaturePCD>;
}

interface CredentialPayload {
  timestamp: number;
  emailPCD?: SerializedPCD<EmailPCD>;
}

async function unpackCredential(
  spcd: SerializedPCD<SemaphoreSignaturePCD>
): Promise<CredentialPayload | null> {
  if (spcd.type !== SemaphoreSignaturePCDPackage.name) {
    throw new Error(`not a semaphore signature pcd`);
  }
  const pcd = await SemaphoreSignaturePCDPackage.deserialize(spcd.pcd);
  const verified = await SemaphoreSignaturePCDPackage.verify(pcd);

  if (verified) {
    const payload: CredentialPayload = JSON.parse(pcd.claim.signedMessage);
    return payload;
  }

  return null;
}

export const feedHost = new FeedHost(
  [
    {
      feed: {
        id: "1",
        name: "First feed",
        description: "First test feed",
        permissions: [
          {
            folder: "Testing",
            type: PCDPermissionType.ReplaceInFolder
          } as ReplaceInFolderPermission
        ],
        credentialRequest: {
          signatureType: "sempahore-signature-pcd",
          pcdType: "email-pcd"
        }
      },
      handleRequest: async (
        req: PollFeedRequest
      ): Promise<PollFeedResponseValue> => {
        if (req.pcd === undefined) {
          throw new Error(`Missing credential`);
        }
        const { pcd, payload } = await verifyFeedCredential(req.pcd);
        console.log(payload);

        if (payload?.pcd && payload.pcd.type === EmailPCDPackage.name) {
          const pcd = await EmailPCDPackage.deserialize(payload?.pcd.pcd);
          const verified =
            (await EmailPCDPackage.verify(pcd)) &&
            _.isEqual(pcd.proof.eddsaPCD.claim.publicKey, ZUPASS_PUBLIC_KEY);
          console.log(verified);
          if (verified) {
            return {
              actions: [
                {
                  pcds: [
                    await issueTestPCD(
                      pcd.claim.emailAddress,
                      pcd.claim.semaphoreId,
                      REGULAR_PRODUCT_ID
                    )
                  ],
                  folder: "Testing",
                  type: PCDActionType.ReplaceInFolder
                } as ReplaceInFolderAction,
                {
                  pcds: [
                    await issueTestPCD(
                      pcd.claim.emailAddress,
                      pcd.claim.semaphoreId,
                      DAYPASS_PRODUCT_ID
                    )
                  ],
                  folder: "Testing",
                  type: PCDActionType.ReplaceInFolder
                } as ReplaceInFolderAction
              ]
            };
          }
        }
        return { actions: [] };
      }
    }
  ],
  "http://localhost:3100/feeds",
  "Test Feed Server"
);

async function issueTestPCD(
  emailAddress: string,
  semaphoreId: string,
  productId: string
): Promise<SerializedPCD<EdDSATicketPCD>> {
  const ticketData = {
    attendeeName: "test name",
    attendeeEmail: emailAddress,
    eventName: "event",
    ticketName: "ticket",
    checkerEmail: "checker@test.com",
    ticketId: uuid(),
    eventId: EVENT_ID,
    productId: productId,
    timestampConsumed: Date.now(),
    timestampSigned: Date.now(),
    attendeeSemaphoreId: semaphoreId,
    isConsumed: false,
    isRevoked: false,
    ticketCategory: TicketCategory.ZuConnect
  };

  const pcd = await EdDSATicketPCDPackage.prove({
    ticket: {
      value: ticketData,
      argumentType: ArgumentTypeName.Object
    },
    privateKey: {
      value: process.env.SERVER_PRIVATE_KEY,
      argumentType: ArgumentTypeName.String
    },
    id: {
      value: undefined,
      argumentType: ArgumentTypeName.String
    }
  });

  return EdDSATicketPCDPackage.serialize(pcd);
}
