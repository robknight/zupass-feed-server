import { TicketCategory } from "@pcd/eddsa-ticket-pcd";
import { readFile } from "jsonfile";
import { z } from "zod";

const TicketSchema = z.object({
  attendeeEmail: z.string(),
  attendeeName: z.string(),
  eventName: z.string(),
  ticketName: z.string(),
  ticketId: z.string().uuid(),
  eventId: z.string().uuid(),
  productId: z.string().uuid(),
  ticketCategory: z.enum(["Devconnect", "ZuConnect"]).transform((str) => {
    if (str === "Devconnect") {
      return TicketCategory.Devconnect;
    } else {
      return TicketCategory.ZuConnect;
    }
  })
});

export type Ticket = z.infer<typeof TicketSchema>;

const TicketFileSchema = z.record(z.array(TicketSchema));

export async function loadTickets(): Promise<Record<string, Ticket[]>> {
  const tickets = TicketFileSchema.parse(await readFile("./feed/tickets.json"));
  return tickets;
}
