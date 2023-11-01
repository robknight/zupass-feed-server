# Zupass Feed Server

This demonstrates a feed server for the issuance of ticket PCDs.

The server offers a feed which you can subscribe to in Zupass. The feed requests your Email PCD as a credential, which allows it to issue tickets to you based on your email address.

## Installation

Run `yarn` or `npm install`.

## Running

Run `yarn dev` or `npm run dev`.

## Configuration

Test tickets are specified in `feed/tickets.json`. You can edit this file to change the folders and ticket types that the feed offers, and the email addresses to which tickets will be issued.
