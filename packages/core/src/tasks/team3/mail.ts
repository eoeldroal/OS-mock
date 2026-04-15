import type { TaskSpec, Viewport } from "../../types.js";
import { buildMailTaskSetup, createMailScenario, createNoteTargets } from "../scenario-builders.js";
import { TEAM3_MAIL_DOMAIN, createTeam3File, createTeam3NoteTarget, defineTeam3Task } from "./shared.js";

export const mailExtractInvoiceTask: TaskSpec = defineTeam3Task({
  id: "mail_extract_invoice_amount",
  split: "starter",
  domain: TEAM3_MAIL_DOMAIN,
  instruction:
    "Open Thunderbird, find the invoice email, extract the total amount due, and save it into a new note named 'invoice_summary.txt'.",
  maxSteps: 15,
  setup: (seed: number, viewport: Viewport) => {
    const invoiceVariants = [
      { invoiceId: "102", amount: "$450.00", sender: "billing@osmock.com" },
      { invoiceId: "215", amount: "$320.00", sender: "finance@osmock.com" },
      { invoiceId: "388", amount: "$780.00", sender: "accounts@osmock.com" }
    ];
    const variant = invoiceVariants[seed % invoiceVariants.length];
    const targetMessageId = `msg-inv-${seed}`;

    return buildMailTaskSetup({
      instruction: `Open Thunderbird, find the email with the subject 'Invoice #${variant.invoiceId}', extract the total amount due, and save it into a new note named 'invoice_summary.txt'.`,
      viewport,
      noteTarget: createTeam3NoteTarget("team3-t1-invoice-note", "invoice_summary.txt"),
      expectedSavedContent: variant.amount,
      targetMessageId,
      messages: [
        {
          id: targetMessageId,
          folderId: "inbox",
          sender: variant.sender,
          subject: `Invoice #${variant.invoiceId}`,
          preview: `Your recent invoice is ready. The total amount due is ${variant.amount}.`,
          body: [
            "Dear Customer,",
            "",
            "Your recent invoice is ready.",
            `The total amount due is ${variant.amount}.`,
            "Thank you."
          ]
        }
      ],
      folders: [{ id: "inbox", name: "Inbox" }]
    });
  }
});

export const mailRecordSenderAddressTask: TaskSpec = defineTeam3Task({
  id: "mail_record_sender_address",
  split: "starter",
  domain: TEAM3_MAIL_DOMAIN,
  instruction:
    "Open Thunderbird, locate the email regarding 'Project Update', and copy the sender's email address into 'contacts.txt' and save it.",
  maxSteps: 12,
  setup: (seed: number, viewport: Viewport) => {
    const senderVariants = [
      { sender: "manager@osmock.local", name: "Manager" },
      { sender: "lead@osmock.local", name: "Team Lead" },
      { sender: "director@osmock.local", name: "Director" }
    ];
    const variant = senderVariants[seed % senderVariants.length];
    const targetMessageId = `msg-target-${seed}`;

    return buildMailTaskSetup({
      instruction:
        "Open Thunderbird, locate the email regarding 'Project Update', and copy the sender's email address into 'contacts.txt' and save it.",
      viewport,
      noteTarget: createTeam3NoteTarget("team3-t5-contacts-note", "contacts.txt"),
      expectedSavedContent: variant.sender,
      targetMessageId,
      messages: [
        {
          id: "msg-distractor",
          folderId: "inbox",
          sender: "newsletter@spam.com",
          subject: "Weekly Deals!",
          preview: "Check out our new items.",
          body: ["Buy now!"]
        },
        {
          id: targetMessageId,
          folderId: "inbox",
          sender: variant.sender,
          subject: "Project Update",
          preview: "Here is the latest status on the project.",
          body: ["Team,", "", "Here is the latest status on the project.", `Best, ${variant.name}`]
        }
      ],
      folders: [{ id: "inbox", name: "Inbox" }]
    });
  }
});

export const mailExtractResetLinkTask: TaskSpec = defineTeam3Task({
  id: "mail_extract_reset_link",
  split: "representative",
  domain: TEAM3_MAIL_DOMAIN,
  instruction:
    "Open Thunderbird, find the 'Password Reset Request' email, extract the reset URL, and save it to 'reset_link.txt'.",
  maxSteps: 12,
  setup: (seed: number, viewport: Viewport) => {
    const tokens = ["token123", "abc789xyz", "zz991reset"];
    const token = tokens[seed % tokens.length];
    const expected = `https://osmock.com/reset/${token}`;
    const targetMessageId = `msg-reset-${seed}`;

    return buildMailTaskSetup({
      instruction:
        "Open Thunderbird, find the 'Password Reset Request' email, extract the reset URL, and save it to 'reset_link.txt'.",
      viewport,
      noteTarget: createTeam3NoteTarget("team3-t6-reset-note", "reset_link.txt"),
      expectedSavedContent: expected,
      targetMessageId,
      messages: [
        {
          id: targetMessageId,
          folderId: "inbox",
          sender: "security@osmock.com",
          subject: "Password Reset Request",
          preview: "Click the link below to reset your password.",
          body: [
            "Hello,",
            "Click the link below to reset your password:",
            expected,
            "If you didn't request this, ignore this email."
          ]
        }
      ],
      folders: [{ id: "inbox", name: "Inbox" }]
    });
  }
});

export const mailExtractMeetingTimeTask: TaskSpec = defineTeam3Task({
  id: "mail_extract_meeting_time",
  split: "representative",
  domain: TEAM3_MAIL_DOMAIN,
  instruction:
    "Open Thunderbird, check the 'Team Sync' email, extract the meeting time, and save it to 'meeting_time.txt'.",
  maxSteps: 12,
  setup: (seed: number, viewport: Viewport) => {
    const meetings = [{ when: "Friday, 10:00 AM" }, { when: "Monday, 2:00 PM" }, { when: "Wednesday, 9:30 AM" }];
    const variant = meetings[seed % meetings.length];
    const targetMessageId = `msg-sync-${seed}`;

    return buildMailTaskSetup({
      instruction:
        "Open Thunderbird, check the 'Team Sync' email, extract the meeting time, and save it to 'meeting_time.txt'.",
      viewport,
      noteTarget: createTeam3NoteTarget("team3-t7-meeting-note", "meeting_time.txt"),
      expectedSavedContent: variant.when,
      targetMessageId,
      messages: [
        {
          id: targetMessageId,
          folderId: "inbox",
          sender: "calendar@osmock.local",
          subject: "Team Sync",
          preview: "You are invited to the weekly team sync.",
          body: ["Event: Weekly Team Sync", `When: ${variant.when}`, "Where: Virtual Room 1", "Please be on time."]
        }
      ],
      folders: [{ id: "inbox", name: "Inbox" }]
    });
  }
});

export const mailExtractTrackingTask: TaskSpec = defineTeam3Task({
  id: "mail_extract_tracking_info",
  split: "representative",
  domain: TEAM3_MAIL_DOMAIN,
  instruction:
    "Open Thunderbird, find the order shipment email, extract the tracking number, and save it to 'tracking_info.txt'.",
  maxSteps: 15,
  setup: (seed: number, viewport: Viewport) => {
    const orderVariants = [
      { orderId: "9921", tracking: "AB123456" },
      { orderId: "4455", tracking: "XC789012" },
      { orderId: "7701", tracking: "ZD345678" }
    ];
    const variant = orderVariants[seed % orderVariants.length];
    const targetMessageId = `msg-target-${seed}`;

    return buildMailTaskSetup({
      instruction: `Open Thunderbird, find the email for 'Order #${variant.orderId}', extract the tracking number, and save it to 'tracking_info.txt'.`,
      viewport,
      noteTarget: createTeam3NoteTarget("team3-t8-track-note", "tracking_info.txt"),
      expectedSavedContent: variant.tracking,
      targetMessageId,
      messages: [
        {
          id: "msg-d1",
          folderId: "inbox",
          sender: "promo@shop.com",
          subject: "Sale 50% Off",
          preview: "Don't miss out!",
          body: ["Sale ends today."]
        },
        {
          id: targetMessageId,
          folderId: "inbox",
          sender: "support@shop.com",
          subject: `Order #${variant.orderId}`,
          preview: "Your order has shipped.",
          body: ["Your order is on the way.", `Tracking: ${variant.tracking}`]
        },
        {
          id: "msg-d2",
          folderId: "inbox",
          sender: "spam@spam.com",
          subject: "Win a free phone",
          preview: "Click here to win.",
          body: ["You are a winner."]
        }
      ],
      folders: [{ id: "inbox", name: "Inbox" }]
    });
  }
});

export const mailExtractSpamSenderTask: TaskSpec = defineTeam3Task({
  id: "mail_extract_spam_sender",
  split: "representative",
  domain: TEAM3_MAIL_DOMAIN,
  instruction:
    "Open Thunderbird, go to the 'Spam' folder, find the 'Important Tax Document' email, extract the sender's address, and save it to 'tax_sender.txt'.",
  maxSteps: 15,
  setup: (seed: number, viewport: Viewport) => {
    const senders = ["tax@irs-mock.gov", "refund@tax-mock.org", "notice@revenue-mock.com"];
    const sender = senders[seed % senders.length];
    const targetMessageId = `msg-tax-${seed}`;
    const noteTarget = createTeam3NoteTarget("team3-t9-tax-note", "tax_sender.txt");
    const scenario = createMailScenario({
      instruction:
        "Open Thunderbird, go to the 'Spam' folder, find the 'Important Tax Document' email, extract the sender's address, and save it to 'tax_sender.txt'.",
      viewport,
      noteTarget,
      noteWindow: false,
      explorerWindow: {
        windowId: "explorer-main",
        bounds: { x: 92, y: 84, width: 336, height: 520 },
        focused: false,
        minimized: false
      },
      mailWindow: {
        windowId: "mail-main",
        bounds: { x: 444, y: 84, width: 592, height: 548 },
        focused: true,
        minimized: false
      },
      scenarioFiles: [createTeam3File("team3-t9-ref", "spam-review.txt", "Review suspicious senders before filing.", "/workspace")],
      messages: [
        {
          id: targetMessageId,
          folderId: "spam",
          sender,
          subject: "Important Tax Document",
          preview: "Please review the attached document.",
          body: ["This message was flagged as spam.", `Sender: ${sender}`, "Please whitelist this address."]
        }
      ],
      folders: [
        { id: "inbox", name: "Inbox" },
        { id: "spam", name: "Spam" }
      ],
      initialFolderId: "inbox"
    });

    return {
      envState: scenario.envState,
      targets: {
        ...createNoteTargets(scenario.noteFileId, sender),
        targetMessageId
      }
    };
  }
});

export const mailExtract2faCodeTask: TaskSpec = defineTeam3Task({
  id: "mail_extract_2fa_code",
  split: "representative",
  domain: TEAM3_MAIL_DOMAIN,
  instruction:
    "Open Thunderbird, locate the 'Your 2FA Code' email, extract the 6-digit code, and save it to '2fa.txt'.",
  maxSteps: 12,
  setup: (seed: number, viewport: Viewport) => {
    const codes = ["849201", "372910", "561083"];
    const code = codes[seed % codes.length];
    const targetMessageId = `msg-2fa-${seed}`;

    return buildMailTaskSetup({
      instruction:
        "Open Thunderbird, locate the 'Your 2FA Code' email, extract the 6-digit code, and save it to '2fa.txt'.",
      viewport,
      noteTarget: createTeam3NoteTarget("team3-t10-2fa-note", "2fa.txt"),
      expectedSavedContent: code,
      targetMessageId,
      messages: [
        {
          id: targetMessageId,
          folderId: "inbox",
          sender: "auth@osmock.com",
          subject: "Your 2FA Code",
          preview: "Use this code to log in.",
          body: ["Hello,", "Here is your temporary login code:", code, "It expires in 10 minutes."]
        }
      ],
      folders: [{ id: "inbox", name: "Inbox" }]
    });
  }
});

export const mailExtractTrashLinkTask: TaskSpec = defineTeam3Task({
  id: "mail_extract_trash_link",
  split: "representative",
  domain: TEAM3_MAIL_DOMAIN,
  instruction:
    "Open Thunderbird, navigate to the 'Trash' folder, find the 'Canceled: Sync' email, extract the Zoom link, and save it to 'recovered_link.txt'.",
  maxSteps: 15,
  setup: (seed: number, viewport: Viewport) => {
    const linkIds = ["99887766", "11223344", "55667788"];
    const linkId = linkIds[seed % linkIds.length];
    const expected = `https://zoom.us/j/${linkId}`;
    const targetMessageId = `msg-trash-${seed}`;

    return buildMailTaskSetup({
      instruction:
        "Open Thunderbird, navigate to the 'Trash' folder, find the 'Canceled: Sync' email, extract the Zoom link, and save it to 'recovered_link.txt'.",
      viewport,
      noteTarget: createTeam3NoteTarget("team3-t16-zoom-note", "recovered_link.txt"),
      expectedSavedContent: expected,
      targetMessageId,
      messages: [
        {
          id: targetMessageId,
          folderId: "trash",
          sender: "system@osmock.local",
          subject: "Canceled: Sync",
          preview: "The meeting has been canceled.",
          body: ["Event canceled.", `Original link: ${expected}`, "Do not join."]
        }
      ],
      folders: [
        { id: "inbox", name: "Inbox" },
        { id: "trash", name: "Trash" }
      ],
      initialFolderId: "inbox"
    });
  }
});

export const mailExtractMessyReceiptTask: TaskSpec = defineTeam3Task({
  id: "mail_extract_messy_receipt_total",
  split: "representative",
  domain: TEAM3_MAIL_DOMAIN,
  instruction:
    "Open Thunderbird, find the 'Your Receipt' email, extract the FINAL Total cost (not subtotal or tax), and save it to 'receipt_total.txt'.",
  maxSteps: 15,
  setup: (seed: number, viewport: Viewport) => {
    const receiptVariants = [
      { subtotal: "$1200.00", tax: "$96.00", total: "$1296.00" },
      { subtotal: "$850.00", tax: "$68.00", total: "$918.00" },
      { subtotal: "$2400.00", tax: "$192.00", total: "$2592.00" }
    ];
    const variant = receiptVariants[seed % receiptVariants.length];
    const targetMessageId = `msg-receipt-${seed}`;

    return buildMailTaskSetup({
      instruction:
        "Open Thunderbird, find the 'Your Receipt' email, extract the FINAL Total cost (not subtotal or tax), and save it to 'receipt_total.txt'.",
      viewport,
      noteTarget: createTeam3NoteTarget("team3-t17-receipt-note", "receipt_total.txt"),
      expectedSavedContent: variant.total,
      targetMessageId,
      messages: [
        {
          id: targetMessageId,
          folderId: "inbox",
          sender: "store@shop.com",
          subject: "Your Receipt",
          preview: "Thank you for your purchase.",
          body: [
            "=== RECEIPT ===",
            `Subtotal: ${variant.subtotal}`,
            `Tax (8%): ${variant.tax}`,
            "-----------------",
            `Total: ${variant.total}`,
            "Thank you!"
          ]
        }
      ],
      folders: [{ id: "inbox", name: "Inbox" }]
    });
  }
});

export const mailExtractFlightPnrTask: TaskSpec = defineTeam3Task({
  id: "mail_extract_flight_pnr",
  split: "representative",
  domain: TEAM3_MAIL_DOMAIN,
  instruction:
    "Open Thunderbird, locate the 'Flight Confirmation' email, extract the 6-character booking reference (PNR), and save it to 'flight_pnr.txt'.",
  maxSteps: 12,
  setup: (seed: number, viewport: Viewport) => {
    const flightVariants = [
      { pnr: "X7Y8Z9", flight: "SK123", dest: "NRT" },
      { pnr: "A1B2C3", flight: "KE456", dest: "LAX" },
      { pnr: "P9Q8R7", flight: "OZ789", dest: "CDG" }
    ];
    const variant = flightVariants[seed % flightVariants.length];
    const targetMessageId = `msg-flight-${seed}`;

    return buildMailTaskSetup({
      instruction:
        "Open Thunderbird, locate the 'Flight Confirmation' email, extract the 6-character booking reference (PNR), and save it to 'flight_pnr.txt'.",
      viewport,
      noteTarget: createTeam3NoteTarget("team3-t18-pnr-note", "flight_pnr.txt"),
      expectedSavedContent: variant.pnr,
      targetMessageId,
      messages: [
        {
          id: targetMessageId,
          folderId: "inbox",
          sender: "airlines@sky.com",
          subject: "Flight Confirmation",
          preview: `Your flight to ${variant.dest} is confirmed.`,
          body: [
            "Booking Confirmed!",
            "Passenger: J. Doe",
            `Booking Reference (PNR): ${variant.pnr}`,
            `Flight: ${variant.flight} to ${variant.dest}`,
            "Have a safe trip."
          ]
        }
      ],
      folders: [{ id: "inbox", name: "Inbox" }]
    });
  }
});

export const mailExtractExceptionNameTask: TaskSpec = defineTeam3Task({
  id: "mail_extract_exception_name",
  split: "representative",
  domain: TEAM3_MAIL_DOMAIN,
  instruction:
    "Open Thunderbird, read the 'Production Crash Report' email, extract the exact Exception name, and save it to 'bug_type.txt'.",
  maxSteps: 12,
  setup: (seed: number, viewport: Viewport) => {
    const exceptions = ["NullPointerException", "IndexOutOfBoundsException", "StackOverflowError"];
    const exceptionName = exceptions[seed % exceptions.length];
    const targetMessageId = `msg-crash-${seed}`;

    return buildMailTaskSetup({
      instruction:
        "Open Thunderbird, read the 'Production Crash Report' email, extract the exact Exception name, and save it to 'bug_type.txt'.",
      viewport,
      noteTarget: createTeam3NoteTarget("team3-t19-bug-note", "bug_type.txt"),
      expectedSavedContent: exceptionName,
      targetMessageId,
      messages: [
        {
          id: targetMessageId,
          folderId: "inbox",
          sender: "monitor@osmock.local",
          subject: "Production Crash Report",
          preview: "Alert: App crashed at 02:00 AM.",
          body: ["Log snippet:", "at main.js:42", `Uncaught Java.lang.${exceptionName}`, "Process exited with code 1."]
        }
      ],
      folders: [{ id: "inbox", name: "Inbox" }]
    });
  }
});

export const mailExtractSshIpTask: TaskSpec = defineTeam3Task({
  id: "mail_extract_ssh_ip",
  split: "representative",
  domain: TEAM3_MAIL_DOMAIN,
  instruction:
    "Open Thunderbird, find the 'New Server Credentials' email, extract the IP address, and save it to 'server_ip.txt'.",
  maxSteps: 12,
  setup: (seed: number, viewport: Viewport) => {
    const ips = ["192.168.1.105", "10.0.0.42", "172.16.5.200"];
    const ip = ips[seed % ips.length];
    const targetMessageId = `msg-server-${seed}`;

    return buildMailTaskSetup({
      instruction:
        "Open Thunderbird, find the 'New Server Credentials' email, extract the IP address, and save it to 'server_ip.txt'.",
      viewport,
      noteTarget: createTeam3NoteTarget("team3-t20-ip-note", "server_ip.txt"),
      expectedSavedContent: ip,
      targetMessageId,
      messages: [
        {
          id: targetMessageId,
          folderId: "inbox",
          sender: "devops@osmock.local",
          subject: "New Server Credentials",
          preview: "Your new dev environment is ready.",
          body: [
            "Here are your connection details:",
            `Host: ${ip}`,
            "User: root",
            "Port: 22",
            "Please change the default password."
          ]
        }
      ],
      folders: [{ id: "inbox", name: "Inbox" }]
    });
  }
});

export const mailExtractCancellationFeeTask: TaskSpec = defineTeam3Task({
  id: "mail_extract_cancellation_fee",
  split: "representative",
  domain: TEAM3_MAIL_DOMAIN,
  instruction:
    "Open Thunderbird, find the 'Re: Refund Request' email. Extract ONLY the cancellation fee amount, and save it to 'fee_amount.txt'.",
  maxSteps: 15,
  setup: (seed: number, viewport: Viewport) => {
    const feeVariants = [
      { original: "$100.00", fee: "$15.00", refund: "$85.00" },
      { original: "$250.00", fee: "$30.00", refund: "$220.00" },
      { original: "$500.00", fee: "$50.00", refund: "$450.00" }
    ];
    const variant = feeVariants[seed % feeVariants.length];
    const targetMessageId = `msg-refund-${seed}`;

    return buildMailTaskSetup({
      instruction:
        "Open Thunderbird, find the 'Re: Refund Request' email. Extract ONLY the cancellation fee amount, and save it to 'fee_amount.txt'.",
      viewport,
      noteTarget: createTeam3NoteTarget("team3-t26-fee-note", "fee_amount.txt"),
      expectedSavedContent: variant.fee,
      targetMessageId,
      messages: [
        {
          id: targetMessageId,
          folderId: "inbox",
          sender: "support@osmock.local",
          subject: "Re: Refund Request",
          preview: `Regarding your refund of ${variant.original}...`,
          body: [
            `> I want a refund for my ${variant.original} ticket.`,
            "",
            "Hello,",
            `We can process the ${variant.original} refund.`,
            `However, a cancellation fee of ${variant.fee} applies.`,
            `Total refunded: ${variant.refund}.`
          ]
        }
      ],
      folders: [{ id: "inbox", name: "Inbox" }]
    });
  }
});

export const mailExtractHrPhoneTask: TaskSpec = defineTeam3Task({
  id: "mail_extract_hr_phone",
  split: "representative",
  domain: TEAM3_MAIL_DOMAIN,
  instruction:
    "Open Thunderbird, find the email sent by 'hr@osmock.local', extract their contact phone number, and save it to 'hr_phone.txt'.",
  maxSteps: 15,
  setup: (seed: number, viewport: Viewport) => {
    const phoneVariants = ["555-0199", "555-0312", "555-0487"];
    const phone = phoneVariants[seed % phoneVariants.length];
    const targetMessageId = `msg-hr-${seed}`;

    return buildMailTaskSetup({
      instruction:
        "Open Thunderbird, find the email sent by 'hr@osmock.local', extract their contact phone number, and save it to 'hr_phone.txt'.",
      viewport,
      noteTarget: createTeam3NoteTarget("team3-t27-hr-note", "hr_phone.txt"),
      expectedSavedContent: phone,
      targetMessageId,
      messages: [
        {
          id: "msg-d1",
          folderId: "inbox",
          sender: "marketing@osmock.local",
          subject: "Welcome!",
          preview: "Call 555-0000",
          body: ["Call 555-0000"]
        },
        {
          id: targetMessageId,
          folderId: "inbox",
          sender: "hr@osmock.local",
          subject: "Onboarding Info",
          preview: "Welcome to the team.",
          body: ["Welcome!", `If you have questions, call HR at ${phone}.`, "Best."]
        }
      ],
      folders: [{ id: "inbox", name: "Inbox" }]
    });
  }
});

export const mailExtractDraftRecipientTask: TaskSpec = defineTeam3Task({
  id: "mail_extract_draft_recipient",
  split: "representative",
  domain: TEAM3_MAIL_DOMAIN,
  instruction:
    "Open Thunderbird, go to the 'Drafts' folder, check the unsent 'Q3 Report' email, extract the recipient's email address, and save it to 'draft_target.txt'.",
  maxSteps: 15,
  setup: (seed: number, viewport: Viewport) => {
    const recipients = ["investors@osmock.com", "board@osmock.com", "cfo@osmock.com"];
    const recipient = recipients[seed % recipients.length];
    const targetMessageId = `msg-draft-${seed}`;

    return buildMailTaskSetup({
      instruction:
        "Open Thunderbird, go to the 'Drafts' folder, check the unsent 'Q3 Report' email, extract the recipient's email address, and save it to 'draft_target.txt'.",
      viewport,
      noteTarget: createTeam3NoteTarget("team3-t28-draft-note", "draft_target.txt"),
      expectedSavedContent: recipient,
      targetMessageId,
      messages: [
        {
          id: targetMessageId,
          folderId: "drafts",
          sender: "me@osmock.local",
          subject: "Q3 Report",
          preview: `Draft to: ${recipient}`,
          body: [`To: ${recipient}`, "Subject: Q3 Report", "", "Please find the attached report."]
        }
      ],
      folders: [
        { id: "inbox", name: "Inbox" },
        { id: "drafts", name: "Drafts" }
      ],
      initialFolderId: "inbox"
    });
  }
});

export const mailExtractPromoCodeTask: TaskSpec = defineTeam3Task({
  id: "mail_extract_promo_code",
  split: "representative",
  domain: TEAM3_MAIL_DOMAIN,
  instruction:
    "Open Thunderbird, read the 'Summer Sale' email, extract the discount promo code, and save it to 'promo_code.txt'.",
  maxSteps: 12,
  setup: (seed: number, viewport: Viewport) => {
    const promoVariants = [
      { code: "SUMMER50", discount: "50%" },
      { code: "FLASH30", discount: "30%" },
      { code: "VIP20", discount: "20%" }
    ];
    const variant = promoVariants[seed % promoVariants.length];
    const targetMessageId = `msg-promo-${seed}`;

    return buildMailTaskSetup({
      instruction:
        "Open Thunderbird, read the 'Summer Sale' email, extract the discount promo code, and save it to 'promo_code.txt'.",
      viewport,
      noteTarget: createTeam3NoteTarget("team3-t29-promo-note", "promo_code.txt"),
      expectedSavedContent: variant.code,
      targetMessageId,
      messages: [
        {
          id: targetMessageId,
          folderId: "inbox",
          sender: "sales@shop.com",
          subject: "Summer Sale",
          preview: `Get ${variant.discount} off today!`,
          body: [
            "Over 10,000 items on sale!",
            `Save ${variant.discount} on everything.`,
            `Use code: ${variant.code} at checkout.`,
            "Valid until 2026-08-31."
          ]
        }
      ],
      folders: [{ id: "inbox", name: "Inbox" }]
    });
  }
});

export const mailExtractDeadlineTask: TaskSpec = defineTeam3Task({
  id: "mail_extract_deadline",
  split: "representative",
  domain: TEAM3_MAIL_DOMAIN,
  instruction:
    "Open Thunderbird, locate the 'Action Required' email, extract the exact deadline date, and save it to 'deadline.txt'.",
  maxSteps: 12,
  setup: (seed: number, viewport: Viewport) => {
    const deadlines = ["October 31st", "November 15th", "December 1st"];
    const deadline = deadlines[seed % deadlines.length];
    const targetMessageId = `msg-action-${seed}`;

    return buildMailTaskSetup({
      instruction:
        "Open Thunderbird, locate the 'Action Required' email, extract the exact deadline date, and save it to 'deadline.txt'.",
      viewport,
      noteTarget: createTeam3NoteTarget("team3-t30-deadline-note", "deadline.txt"),
      expectedSavedContent: deadline,
      targetMessageId,
      messages: [
        {
          id: targetMessageId,
          folderId: "inbox",
          sender: "compliance@osmock.local",
          subject: "Action Required: Training",
          preview: "Please complete your mandatory training.",
          body: ["Hello,", "You have pending mandatory training modules.", `Deadline: ${deadline}.`, "Thank you."]
        }
      ],
      folders: [{ id: "inbox", name: "Inbox" }]
    });
  }
});

export const mailExtractRebookedFlightTask: TaskSpec = defineTeam3Task({
  id: "mail_extract_rebooked_flight",
  split: "representative",
  domain: TEAM3_MAIL_DOMAIN,
  instruction:
    "Open Thunderbird, find the 'Flight Canceled' email, extract your NEW rebooked flight number, and save it to 'new_flight.txt'.",
  maxSteps: 15,
  setup: (seed: number, viewport: Viewport) => {
    const flightVariants = [
      { original: "AB123", rebooked: "XY987" },
      { original: "KE201", rebooked: "OZ445" },
      { original: "LH789", rebooked: "TG102" }
    ];
    const variant = flightVariants[seed % flightVariants.length];
    const targetMessageId = `msg-cancel-${seed}`;

    return buildMailTaskSetup({
      instruction:
        "Open Thunderbird, find the 'Flight Canceled' email, extract your NEW rebooked flight number, and save it to 'new_flight.txt'.",
      viewport,
      noteTarget: createTeam3NoteTarget("team3-t37-flight-note", "new_flight.txt"),
      expectedSavedContent: variant.rebooked,
      targetMessageId,
      messages: [
        {
          id: targetMessageId,
          folderId: "inbox",
          sender: "urgent@airlines.com",
          subject: "Flight Canceled",
          preview: "Important information regarding your trip.",
          body: [
            "Dear Passenger,",
            `We regret to inform you that your original flight ${variant.original} has been canceled.`,
            `You have been automatically rebooked on flight ${variant.rebooked}.`,
            "We apologize for the inconvenience."
          ]
        }
      ],
      folders: [{ id: "inbox", name: "Inbox" }]
    });
  }
});

export const mailExtractUnsubscribeLinkTask: TaskSpec = defineTeam3Task({
  id: "mail_extract_unsubscribe_link",
  split: "representative",
  domain: TEAM3_MAIL_DOMAIN,
  instruction:
    "Open Thunderbird, read the long 'Weekly Tech Digest' email, find the unsubscribe URL at the very bottom, and save it to 'unsubscribe.txt'.",
  maxSteps: 15,
  setup: (seed: number, viewport: Viewport) => {
    const unsubIds = ["999", "1024", "777"];
    const unsubId = unsubIds[seed % unsubIds.length];
    const expected = `https://osmock.com/unsub/${unsubId}`;
    const targetMessageId = `msg-digest-${seed}`;

    return buildMailTaskSetup({
      instruction:
        "Open Thunderbird, read the long 'Weekly Tech Digest' email, find the unsubscribe URL at the very bottom, and save it to 'unsubscribe.txt'.",
      viewport,
      noteTarget: createTeam3NoteTarget("team3-t39-unsub-note", "unsubscribe.txt"),
      expectedSavedContent: expected,
      targetMessageId,
      messages: [
        {
          id: targetMessageId,
          folderId: "inbox",
          sender: "newsletter@tech.com",
          subject: "Weekly Tech Digest",
          preview: "Here is the latest news in tech.",
          body: [
            "Welcome to the Weekly Tech Digest!",
            "1. New AI model released.",
            "2. Quantum computing breakthrough.",
            "3. Cybersecurity updates.",
            "(...many more lines of news...)",
            "Thank you for reading.",
            `To stop receiving these emails, unsubscribe here: ${expected}`
          ]
        }
      ],
      folders: [{ id: "inbox", name: "Inbox" }]
    });
  }
});

export const TEAM3_MAIL_TASKS: TaskSpec[] = [
  mailExtractInvoiceTask,
  mailRecordSenderAddressTask,
  mailExtractResetLinkTask,
  mailExtractMeetingTimeTask,
  mailExtractTrackingTask,
  mailExtractSpamSenderTask,
  mailExtract2faCodeTask,
  mailExtractTrashLinkTask,
  mailExtractMessyReceiptTask,
  mailExtractFlightPnrTask,
  mailExtractExceptionNameTask,
  mailExtractSshIpTask,
  mailExtractCancellationFeeTask,
  mailExtractHrPhoneTask,
  mailExtractDraftRecipientTask,
  mailExtractPromoCodeTask,
  mailExtractDeadlineTask,
  mailExtractRebookedFlightTask,
  mailExtractUnsubscribeLinkTask
];
