# Support Summary

This document explains how the support system works in the backend project.

## Overview
The support module allows users such as buyers, vendors, and founders to create, manage, and follow up on support tickets. It supports ticket creation, replies, status updates, assignment, resolution, and ticket history.

## Main Flow
1. A user submits a support ticket through the support API.
2. The request is validated and passed to the controller.
3. The service layer handles the business logic.
4. The ticket is stored in the database with metadata such as type, category, priority, status, and attachments.
5. Replies, notifications, and audit logs are created as the ticket moves through its lifecycle.

## Key Components

### 1. Routes
The support endpoints are defined in [routes/support.routes.js](routes/support.routes.js).
They handle:
- Creating tickets
- Viewing a user’s tickets
- Viewing a single ticket
- Updating tickets
- Closing or reopening tickets
- Deleting or restoring tickets
- Adding replies
- Viewing replies
- Founder-only actions like assignment, resolution, and status updates

### 2. Controllers
The controller layer in [controllers/common/support.controller.js](controllers/common/support.controller.js) receives incoming requests, calls the appropriate service method, and sends responses back to the client.

### 3. Services
The main business logic lives in [services/support/support.service.js](services/support/support.service.js).
It manages:
- Ticket creation
- Ownership checks
- Status changes
- Replies
- Notifications
- Audit log creation
- Ticket assignment and resolution

### 4. Models
The support module uses these data models:
- [models/support/SupportTicket.js](models/support/SupportTicket.js) for the ticket itself
- [models/support/SupportReply.js](models/support/SupportReply.js) for ticket replies

### 5. Validation
Request validation is handled in [validators/support.validation.js](validators/support.validation.js).
It ensures that fields like ticket type, category, subject, description, priority, and reply content are valid.

### 6. Constants
The support behavior is driven by constants in [constants/support.constants.js](constants/support.constants.js), including:
- User types
- Ticket types
- Ticket status values
- Ticket priorities
- Categories by ticket type
- SLA timing values
- Allowed status transitions

## Ticket Lifecycle
A support ticket can go through the following states:
- Open
- In progress
- Waiting for user
- Waiting for support
- Resolved
- Closed
- Rejected

Support actions include:
- Create ticket
- Update ticket
- Add reply
- Close ticket
- Reopen ticket
- Delete ticket
- Restore ticket
- Assign ticket
- Resolve ticket
- Add internal note

## Authorization
The system uses authentication and role checks:
- Regular users can manage their own tickets.
- Founders can access all tickets and perform internal support actions.
- Ownership validation prevents unauthorized access to another user’s ticket.

## Attachments and Communication
Support tickets can include file attachments, and each action can trigger:
- Notifications to relevant users
- Audit logs for tracking activity
- Socket-based events for live updates
- Email placeholders for future email integration

## Summary
In short, the support system is a structured ticketing workflow that allows users to report issues, receive responses, and track progress while giving founders tools to manage and resolve tickets efficiently.
