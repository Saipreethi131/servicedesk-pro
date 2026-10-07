import { connectDB, disconnectDB } from "../config/db.js";
import User from "../models/User.js";
import "../models/Department.js"; // registers the schema so ticket.service.js's populate("department", "name") can resolve it
import Category from "../models/Category.js";
import Ticket from "../models/Ticket.js";
import { createTicket, transitionTicket, createComment } from "../services/ticket.service.js";
import { TICKET_STATUS } from "./constants.js";

const COLLATION = { locale: "en", strength: 2 }; // same as Category's own unique index (D5.4)

const requireUser = async (email) => {
  const user = await User.findOne({ email });
  if (!user) throw new Error(`Required seed user not found: ${email}. Run "npm run seed" first.`);
  return user;
};

// childName omitted (e.g. "Other") means the top-level category is itself the leaf (D5.4).
const requireCategory = async (topName, childName = null) => {
  const top = await Category.findOne({ parent: null, name: topName }).collation(COLLATION);
  if (!top) throw new Error(`Required seed category not found: "${topName}". Run "npm run seed-categories" first.`);
  if (childName === null) return top;
  const child = await Category.findOne({ parent: top._id, name: childName }).collation(COLLATION);
  if (!child) {
    throw new Error(`Required seed category not found: "${topName} / ${childName}". Run "npm run seed-categories" first.`);
  }
  return child;
};

const file = (requester, category, impact, urgency, title, description) =>
  createTicket(requester, { title, description, category: String(category._id), impact, urgency });

const claim = (ticket, actor) => transitionTicket(actor, ticket._id, TICKET_STATUS.ASSIGNED);
const assign = (ticket, manager, assignee) => transitionTicket(manager, ticket._id, TICKET_STATUS.ASSIGNED, { assigneeId: String(assignee._id) });
const advance = (ticket, actor, toStatus) => transitionTicket(actor, ticket._id, toStatus);

const main = async () => {
  await connectDB();

  const existing = await Ticket.countDocuments({});
  if (existing > 0) {
    console.log(`Tickets already exist (${existing} found) - skipping. This script never duplicates on a rerun.`);
    return;
  }

  // --- dependencies: fail closed, before creating anything, so a missing one never leaves a partial seed ---
  const admin = await requireUser("admin@servicedesk.test");
  const manager = await requireUser("manager@servicedesk.test");
  const tech = await requireUser("tech@servicedesk.test");
  const assets = await requireUser("assets@servicedesk.test");
  const employee = await requireUser("employee@servicedesk.test"); // IT Support
  const employeeFacilities = await requireUser("employee.facilities@servicedesk.test"); // Facilities

  const catWifi = await requireCategory("Network", "Wi-Fi");
  const catPrinter = await requireCategory("Hardware", "Printer");
  const catNewAccount = await requireCategory("Accounts & Access", "New account");
  const catLicense = await requireCategory("Software", "License");
  const catDesktop = await requireCategory("Hardware", "Desktop");
  const catPeripherals = await requireCategory("Hardware", "Peripherals");
  const catAppError = await requireCategory("Software", "Application error");
  const catConnectivity = await requireCategory("Network", "Connectivity");
  const catInstallation = await requireCategory("Software", "Installation");
  const catPermissions = await requireCategory("Accounts & Access", "Permissions");
  const catPasswordReset = await requireCategory("Accounts & Access", "Password reset");
  const catLaptop = await requireCategory("Hardware", "Laptop");
  const catVpn = await requireCategory("Network", "VPN");
  const catOther = await requireCategory("Other");

  const statusCounts = {};
  const bump = (status) => {
    statusCounts[status] = (statusCounts[status] ?? 0) + 1;
  };
  let commentCount = 0;
  const note = async (actor, ticket, body, isInternal) => {
    await createComment(actor, ticket._id, { body, ...(isInternal && { isInternal: true }) });
    commentCount++;
  };

  // --- NEW (unassigned): 3 ---
  const t1 = await file(
    employee,
    catWifi,
    "MEDIUM",
    "MEDIUM",
    "Laptop won't connect to office Wi-Fi",
    "My laptop keeps disconnecting from the office Wi-Fi every few minutes since this morning. It worked fine yesterday and I haven't changed anything."
  );
  bump(t1.status);

  const t2 = await file(
    employeeFacilities,
    catPrinter,
    "LOW",
    "LOW",
    "Printer on the 2nd floor is low on toner",
    "The shared printer near the facilities office is showing a toner-low warning and the print quality has gotten noticeably worse over the last day."
  );
  bump(t2.status);

  const t3 = await file(
    employee,
    catNewAccount,
    "HIGH",
    "HIGH",
    "Need VPN access for new hire starting Monday",
    "We have a new hire starting Monday and they will need VPN and network access provisioned before then so they can work remotely from day one."
  );
  bump(t3.status);
  await note(employee, t3, "Quick follow-up - the new hire's start date is confirmed for Monday, so this is time-sensitive.");

  // --- ASSIGNED: 3 (one via a manager actively assigning, not a self-claim, for variety) ---
  let t4 = await file(
    employee,
    catLicense,
    "MEDIUM",
    "HIGH",
    "Design software license expired",
    "My Adobe Creative Cloud license shows as expired and I can no longer open any of my project files. I need this working again to hit a deadline this week."
  );
  t4 = await assign(t4, manager, tech);
  bump(t4.status);
  await note(tech, t4, "Looking into this now - checking with the license vendor on the renewal status.");

  // Facilities has no technician/asset-manager of its own in the seed data; a SYSTEM_ADMIN acts across any
  // department (D3.9/D6.4, same fix as the earlier ticketTransitions.js correction), so admin stands in here.
  let t5 = await file(
    employeeFacilities,
    catDesktop,
    "MEDIUM",
    "LOW",
    "Desktop monitor has a flickering screen",
    "The monitor at my desk has started flickering intermittently, especially when I move the cable. It's distracting but still usable for now."
  );
  t5 = await claim(t5, admin);
  bump(t5.status);

  let t6 = await file(
    tech,
    catPeripherals,
    "LOW",
    "MEDIUM",
    "Replacement mouse needed for spare workstation",
    "The wireless mouse on the spare IT workstation has stopped responding and needs to be replaced before it can be handed out to the next new hire."
  );
  t6 = await claim(t6, tech); // TECHNICIAN filing for, and claiming, themselves
  bump(t6.status);

  // --- IN_PROGRESS: 3 ---
  let t7 = await file(
    employee,
    catAppError,
    "HIGH",
    "MEDIUM",
    "Expense reporting app crashes on submit",
    "The internal expense reporting application crashes every time I try to submit a report with more than one attachment. I've tried on two different browsers."
  );
  t7 = await claim(t7, tech);
  t7 = await advance(t7, tech, TICKET_STATUS.IN_PROGRESS);
  bump(t7.status);
  await note(tech, t7, "Able to reproduce this with two attachments. Digging into the server logs now.");
  // isInternal:true, visible to staff (TECHNICIAN/IT_MANAGER/ASSET_MANAGER/SYSTEM_ADMIN) but not the EMPLOYEE requester.
  await note(
    tech,
    t7,
    "Found a stack trace pointing at the file upload handler - looks like a size-limit bug, escalating to the vendor.",
    true
  );

  let t8 = await file(
    employeeFacilities,
    catConnectivity,
    "MEDIUM",
    "MEDIUM",
    "Intermittent network drops in the facilities office",
    "Our office loses network connectivity for a minute or two several times a day. It's affecting everyone on this floor, not just me."
  );
  t8 = await claim(t8, admin); // Facilities ticket - see the note on t5
  t8 = await advance(t8, admin, TICKET_STATUS.IN_PROGRESS);
  bump(t8.status);

  let t9 = await file(
    tech,
    catInstallation,
    "LOW",
    "LOW",
    "Install updated diagnostic tools on IT workstation",
    "I need the latest version of our diagnostic toolkit installed on the IT support workstation before I can start on the next batch of hardware checks."
  );
  t9 = await claim(t9, tech);
  t9 = await advance(t9, tech, TICKET_STATUS.IN_PROGRESS);
  bump(t9.status);

  // --- WAITING_ON_REQUESTER: 2 ---
  let t10 = await file(
    employee,
    catPermissions,
    "HIGH",
    "LOW",
    "Request access to shared finance drive",
    "I need read access to the shared finance drive for a project I'm starting next week. My manager approved this over email."
  );
  t10 = await claim(t10, tech);
  t10 = await advance(t10, tech, TICKET_STATUS.IN_PROGRESS);
  t10 = await advance(t10, tech, TICKET_STATUS.WAITING_ON_REQUESTER);
  bump(t10.status);
  await note(tech, t10, "Could you forward the manager approval email so I can attach it to the access request?");

  let t11 = await file(
    employeeFacilities,
    catPasswordReset,
    "LOW",
    "HIGH",
    "Locked out of facilities booking system",
    "I'm locked out of the room booking system after too many failed login attempts and need my password reset so I can book a meeting room today."
  );
  t11 = await claim(t11, admin); // Facilities ticket - see the note on t5
  t11 = await advance(t11, admin, TICKET_STATUS.IN_PROGRESS);
  t11 = await advance(t11, admin, TICKET_STATUS.WAITING_ON_REQUESTER);
  bump(t11.status);

  // --- RESOLVED: 3 ---
  let t12 = await file(
    employee,
    catLaptop,
    "HIGH",
    "HIGH",
    "Laptop won't power on after firmware update",
    "My laptop shows a black screen and won't power on since the mandatory firmware update ran overnight. I have back-to-back meetings today and need a working machine."
  );
  t12 = await claim(t12, tech);
  t12 = await advance(t12, tech, TICKET_STATUS.IN_PROGRESS);
  t12 = await advance(t12, tech, TICKET_STATUS.RESOLVED);
  bump(t12.status);
  await note(tech, t12, "Forced a hard restart and reseated the battery - the laptop boots normally now. Let us know if it happens again.");

  let t13 = await file(
    employeeFacilities,
    catWifi,
    "MEDIUM",
    "MEDIUM",
    "Guest Wi-Fi not working for visitors",
    "Visitors in the facilities lobby are unable to connect to the guest Wi-Fi network. It just shows \"unable to join network\" on their phones."
  );
  t13 = await claim(t13, admin); // Facilities ticket - see the note on t5
  t13 = await advance(t13, admin, TICKET_STATUS.IN_PROGRESS);
  t13 = await advance(t13, admin, TICKET_STATUS.RESOLVED);
  bump(t13.status);

  let t14 = await file(
    tech,
    catOther,
    "LOW",
    "LOW",
    "Label maker in the IT closet needs new tape",
    "The label maker we use for tagging hardware is out of tape. Picked up a replacement roll and swapped it in."
  );
  t14 = await claim(t14, tech);
  t14 = await advance(t14, tech, TICKET_STATUS.IN_PROGRESS);
  t14 = await advance(t14, tech, TICKET_STATUS.RESOLVED);
  bump(t14.status);

  // --- CLOSED: 2 ---
  let t15 = await file(
    employee,
    catPrinter,
    "MEDIUM",
    "HIGH",
    "Printer jammed with a stack of confidential documents",
    "The printer near my desk jammed halfway through printing a batch of confidential documents and I can't clear the jam myself."
  );
  t15 = await claim(t15, tech);
  t15 = await advance(t15, tech, TICKET_STATUS.IN_PROGRESS);
  t15 = await advance(t15, tech, TICKET_STATUS.RESOLVED);
  t15 = await advance(t15, employee, TICKET_STATUS.CLOSED); // closed by the requester (D6.3)
  bump(t15.status);

  let t16 = await file(
    employeeFacilities,
    catVpn,
    "LOW",
    "LOW",
    "VPN disconnects when laptop goes to sleep",
    "My VPN connection drops every time my laptop goes to sleep and I have to reconnect manually each morning. Minor annoyance but happens daily."
  );
  t16 = await claim(t16, admin); // Facilities ticket - see the note on t5
  t16 = await advance(t16, admin, TICKET_STATUS.IN_PROGRESS);
  t16 = await advance(t16, admin, TICKET_STATUS.RESOLVED);
  t16 = await advance(t16, employeeFacilities, TICKET_STATUS.CLOSED); // closing by the requester needs no department match
  bump(t16.status);

  // --- ESCALATED: 1, genuinely escalated ---
  // Through ASSIGNED -> IN_PROGRESS via the real service, same as every other ticket; only the escalation itself
  // is simulated, because waiting for the real 5-minute sweep isn't practical here. Set up exactly as
  // runEscalationSweep would leave it: status, escalatedAt, and a by:null history row (P8, D8.3).
  let t17 = await file(
    employee,
    catConnectivity,
    "HIGH",
    "HIGH",
    "Entire floor lost network connectivity",
    "The whole 3rd floor lost network access about an hour ago and nobody on the team can reach any internal systems. This is blocking the whole team."
  );
  t17 = await claim(t17, tech);
  t17 = await advance(t17, tech, TICKET_STATUS.IN_PROGRESS);
  const escalatedAt = new Date();
  await Ticket.updateOne(
    { _id: t17._id },
    {
      $set: {
        status: TICKET_STATUS.ESCALATED,
        escalatedAt,
        resolutionDeadline: new Date(escalatedAt.getTime() - 60 * 60 * 1000), // an hour overdue, so it reads as genuinely escalated
      },
      $push: { history: { from: TICKET_STATUS.IN_PROGRESS, to: TICKET_STATUS.ESCALATED, by: null, at: escalatedAt } },
    }
  );
  bump(TICKET_STATUS.ESCALATED);

  const total = Object.values(statusCounts).reduce((a, b) => a + b, 0);
  console.log("\nTickets created by status:");
  for (const [status, count] of Object.entries(statusCounts)) {
    console.log(`  ${status.padEnd(22)} ${count}`);
  }
  console.log(`  ${"TOTAL".padEnd(22)} ${total}`);
  console.log(`\nComments created: ${commentCount}`);
};

let exitCode = 0;
try {
  await main();
} catch (err) {
  exitCode = 1;
  console.error(`\nseed-tickets failed: ${err.message}`);
} finally {
  await disconnectDB();
  process.exit(exitCode);
}
