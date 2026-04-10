import type { TaskSpec, Viewport, EnvState } from "../types.js";

// ============================================================================
// [공통 헬퍼] 가상 OS의 기초 상태를 생성하는 함수
// ============================================================================
function createBaseEnv(viewport: Viewport): EnvState {
  return {
    viewport,
    pointer: { x: viewport.width / 2, y: viewport.height / 2, buttonsPressed: [] },
    keyboard: { pressedKeys: [] },
    clipboard: { text: "" },
    fileSystem: { cwd: "/home/user", files: {}, order: [] },
    windows: [],
    appStates: {
      fileExplorer: { "explorer1": { id: "explorer1" } },
      noteEditor: { "note1": { id: "note1", fileId: "", buffer: "", cursorIndex: 0, dirty: false } },
      browserLite: { "browser1": { id: "browser1", appName: "", url: "", pageTitle: "", currentPage: "explorer", tabs: [], bookmarks: [], categories: [], selectedCategoryId: "", selectedTaskId: "", helpLines: [] } },
      terminalLite: { "terminal1": { id: "terminal1", cwd: "/home/user", prompt: "user@os-mock:~$ ", lines: [], input: "", status: "idle", lastCommand: "", lastOutput: "", executedCommands: [] } },
      mailLite: { "mail1": { id: "mail1", selectedFolder: "inbox", folders: [], messages: [], selectedMessageId: "", previewBody: [] } }
    },
    popups: [],
    taskbarHeight: 48,
  };
}

// ============================================================================
// [개선 요약]
// 1. seedDefaults 확장 + setup 함수 내 seed 파라미터 실제 활용
// 2. split을 난이도 기반으로 재분류 (starter / representative / eval)
// 3. 주요 task에 forbiddenPredicates 추가
// 4. ls 출력 targetText를 "\n" 구분으로 통일 (실제 ls 출력 형식)
// ============================================================================


// ============================================================================
// Task 1: 메일에서 청구 금액 추출 [starter]
// seed variation: 인보이스 번호, 금액
// ============================================================================
export const mailExtractInvoiceTask: TaskSpec = {
  id: "mail_extract_invoice_amount",
  split: "starter",
  domain: "Thunderbird + Note Editor",
  instruction: "Open Thunderbird, find the email with the subject 'Invoice #{{invoiceId}}', extract the total amount due, and save it into a new note named 'invoice_summary.txt'.",
  maxSteps: 15,
  seedDefaults: [0, 1, 2],

  setup: (seed: number, viewport: Viewport) => {
    const invoiceVariants = [
      { invoiceId: "102", amount: "$450.00", sender: "billing@osmock.com" },
      { invoiceId: "215", amount: "$320.00", sender: "finance@osmock.com" },
      { invoiceId: "388", amount: "$780.00", sender: "accounts@osmock.com" },
    ];
    const v = invoiceVariants[seed % invoiceVariants.length];
    const envState = createBaseEnv(viewport);

    envState.appStates.mailLite["mail1"].folders = [{ id: "inbox", name: "Inbox", unread: 1 }];
    envState.appStates.mailLite["mail1"].messages = [{
      id: `msg-inv-${seed}`,
      folderId: "inbox",
      sender: v.sender,
      subject: `Invoice #${v.invoiceId}`,
      preview: `Your recent invoice is ready. The total amount due is ${v.amount}.`,
      body: ["Dear Customer,", "", "Your recent invoice is ready.", `The total amount due is ${v.amount}.`, "Thank you."]
    }];

    return {
      envState,
      targets: { targetNoteName: "invoice_summary.txt", targetText: v.amount }
    };
  },
  goalPredicates: ["note.saved"],
  progressPredicates: ["mail.message_opened", "note.target_appended"],
  forbiddenPredicates: []
};

// ============================================================================
// Task 2: 터미널 파일 목록 저장 [starter]
// seed variation: 디렉토리 경로, 파일 목록
// 개선: targetText를 "\n" 구분으로 통일
// ============================================================================
export const terminalListDirTask: TaskSpec = {
  id: "terminal_list_directory_contents",
  split: "starter",
  domain: "Terminal + Note Editor",
  instruction: "Open Terminal, run 'ls' to list the files in the current directory, and record the file names into a note called 'dir_contents.txt', then save it.",
  maxSteps: 15,
  seedDefaults: [0, 1, 2],

  setup: (seed: number, viewport: Viewport) => {
    const dirVariants = [
      {
        cwd: "/home/user/workspace",
        files: ["report.txt", "notes.md"],
      },
      {
        cwd: "/home/user/documents",
        files: ["memo.txt", "summary.txt"],
      },
      {
        cwd: "/home/user/project",
        files: ["index.ts", "README.md"],
      },
    ];
    const v = dirVariants[seed % dirVariants.length];
    const envState = createBaseEnv(viewport);

    envState.fileSystem.cwd = v.cwd;
    envState.appStates.terminalLite["terminal1"].cwd = v.cwd;
    envState.fileSystem.files = Object.fromEntries(
      v.files.map((name, i) => [name, { id: `f${i}`, name, path: `${v.cwd}/${name}`, content: "" }])
    );
    envState.fileSystem.order = v.files;

    return {
      envState,
      targets: { targetNoteName: "dir_contents.txt", targetText: v.files.join("\n") }
    };
  },
  goalPredicates: ["note.saved"],
  progressPredicates: ["terminal.command_ran", "note.target_appended"],
  forbiddenPredicates: []
};

// ============================================================================
// Task 3: 현재 작업 디렉토리 경로 기록 [starter]
// seed variation: 경로 깊이 및 경로명
// ============================================================================
export const terminalRecordWorkingDirectoryTask: TaskSpec = {
  id: "terminal_record_working_directory",
  split: "starter",
  domain: "Terminal + Note Editor",
  instruction: "Open Terminal, execute the command to print the current working directory, and save the absolute path to 'cwd_log.txt'.",
  maxSteps: 12,
  seedDefaults: [0, 1, 2],

  setup: (seed: number, viewport: Viewport) => {
    const pathVariants = [
      "/home/user/projects/os-mock/src",
      "/home/user/workspace/backend/api",
      "/var/www/html/public/assets",
    ];
    const specificPath = pathVariants[seed % pathVariants.length];
    const envState = createBaseEnv(viewport);

    envState.fileSystem.cwd = specificPath;
    envState.appStates.terminalLite["terminal1"].cwd = specificPath;

    return {
      envState,
      targets: { targetNoteName: "cwd_log.txt", targetText: specificPath }
    };
  },
  goalPredicates: ["note.saved"],
  progressPredicates: ["terminal.command_ran", "note.target_appended"],
  forbiddenPredicates: []
};

// ============================================================================
// Task 4: 파일 내용(cat) 중 특정 설정값 추출 [representative]
// seed variation: 포트 번호, 파일명
// ============================================================================
export const terminalCatAndSaveConfigTask: TaskSpec = {
  id: "terminal_cat_and_save_config",
  split: "representative",
  domain: "Terminal + Note Editor",
  instruction: "Open Terminal, use the 'cat' command to read 'server_config.json', and copy the port number into a note named 'port_backup.txt'. Save the note.",
  maxSteps: 15,
  seedDefaults: [0, 1, 2],

  setup: (seed: number, viewport: Viewport) => {
    const configVariants = [
      { port: "8080", host: "localhost" },
      { port: "3000", host: "127.0.0.1" },
      { port: "5000", host: "0.0.0.0" },
    ];
    const v = configVariants[seed % configVariants.length];
    const envState = createBaseEnv(viewport);
    const cwd = "/home/user";

    envState.fileSystem.files = {
      "server_config.json": {
        id: "conf1",
        name: "server_config.json",
        path: `${cwd}/server_config.json`,
        content: `{\n  "host": "${v.host}",\n  "port": ${v.port}\n}`
      }
    };
    envState.fileSystem.order = ["server_config.json"];

    return {
      envState,
      targets: { targetNoteName: "port_backup.txt", targetText: v.port }
    };
  },
  goalPredicates: ["note.saved"],
  progressPredicates: ["terminal.command_ran", "note.target_appended"],
  forbiddenPredicates: []
};

// ============================================================================
// Task 5: 메일 본문에서 발신자 주소 추출 [starter]
// seed variation: 발신자, 제목, distractor 메일
// ============================================================================
export const mailRecordSenderAddressTask: TaskSpec = {
  id: "mail_record_sender_address",
  split: "starter",
  domain: "Thunderbird + Note Editor",
  instruction: "Open Thunderbird, locate the email regarding 'Project Update', and copy the sender's email address into 'contacts.txt' and save it.",
  maxSteps: 12,
  seedDefaults: [0, 1, 2],

  setup: (seed: number, viewport: Viewport) => {
    const senderVariants = [
      { sender: "manager@osmock.local", name: "Manager" },
      { sender: "lead@osmock.local", name: "Team Lead" },
      { sender: "director@osmock.local", name: "Director" },
    ];
    const v = senderVariants[seed % senderVariants.length];
    const envState = createBaseEnv(viewport);

    envState.appStates.mailLite["mail1"].folders = [{ id: "inbox", name: "Inbox", unread: 2 }];
    envState.appStates.mailLite["mail1"].messages = [
      {
        id: "msg-distractor",
        folderId: "inbox",
        sender: "newsletter@spam.com",
        subject: "Weekly Deals!",
        preview: "Check out our new items.",
        body: ["Buy now!"]
      },
      {
        id: `msg-target-${seed}`,
        folderId: "inbox",
        sender: v.sender,
        subject: "Project Update",
        preview: "Here is the latest status on the project.",
        body: ["Team,", "", "Here is the latest status on the project.", `Best, ${v.name}`]
      }
    ];

    return {
      envState,
      targets: { targetNoteName: "contacts.txt", targetText: v.sender }
    };
  },
  goalPredicates: ["note.saved"],
  progressPredicates: ["mail.message_opened", "note.target_appended"],
  forbiddenPredicates: []
};


// ============================================================================
// [Mail Family 확장] Task 6 ~ 10
// ============================================================================

// Task 6: 비밀번호 재설정 메일에서 URL 추출 [representative]
// seed variation: 토큰 값
export const mailExtractResetLinkTask: TaskSpec = {
  id: "mail_extract_reset_link",
  split: "representative",
  domain: "Thunderbird + Note Editor",
  instruction: "Open Thunderbird, find the 'Password Reset Request' email, extract the reset URL, and save it to 'reset_link.txt'.",
  maxSteps: 12,
  seedDefaults: [0, 1, 2],

  setup: (seed: number, viewport: Viewport) => {
    const tokens = ["token123", "abc789xyz", "zz991reset"];
    const token = tokens[seed % tokens.length];
    const envState = createBaseEnv(viewport);

    envState.appStates.mailLite["mail1"].folders = [{ id: "inbox", name: "Inbox", unread: 1 }];
    envState.appStates.mailLite["mail1"].messages = [{
      id: `msg-reset-${seed}`,
      folderId: "inbox",
      sender: "security@osmock.com",
      subject: "Password Reset Request",
      preview: "Click the link below to reset your password.",
      body: ["Hello,", "Click the link below to reset your password:", `https://osmock.com/reset/${token}`, "If you didn't request this, ignore this email."]
    }];

    return { envState, targets: { targetNoteName: "reset_link.txt", targetText: `https://osmock.com/reset/${token}` } };
  },
  goalPredicates: ["note.saved"],
  progressPredicates: ["mail.message_opened", "note.target_appended"],
  forbiddenPredicates: []
};

// Task 7: 일정 초대 메일에서 미팅 시간 추출 [representative]
// seed variation: 요일, 시간
export const mailExtractMeetingTimeTask: TaskSpec = {
  id: "mail_extract_meeting_time",
  split: "representative",
  domain: "Thunderbird + Note Editor",
  instruction: "Open Thunderbird, check the 'Team Sync' email, extract the meeting time, and save it to 'meeting_time.txt'.",
  maxSteps: 12,
  seedDefaults: [0, 1, 2],

  setup: (seed: number, viewport: Viewport) => {
    const meetings = [
      { when: "Friday, 10:00 AM" },
      { when: "Monday, 2:00 PM" },
      { when: "Wednesday, 9:30 AM" },
    ];
    const v = meetings[seed % meetings.length];
    const envState = createBaseEnv(viewport);

    envState.appStates.mailLite["mail1"].folders = [{ id: "inbox", name: "Inbox", unread: 1 }];
    envState.appStates.mailLite["mail1"].messages = [{
      id: `msg-sync-${seed}`,
      folderId: "inbox",
      sender: "calendar@osmock.local",
      subject: "Team Sync",
      preview: "You are invited to the weekly team sync.",
      body: ["Event: Weekly Team Sync", `When: ${v.when}`, "Where: Virtual Room 1", "Please be on time."]
    }];

    return { envState, targets: { targetNoteName: "meeting_time.txt", targetText: v.when } };
  },
  goalPredicates: ["note.saved"],
  progressPredicates: ["mail.message_opened", "note.target_appended"],
  forbiddenPredicates: []
};

// Task 8: [Distractor 강화] 특정 주문의 트래킹 번호 추출 [representative]
// seed variation: 주문 번호, 트래킹 번호, distractor 수
export const mailExtractTrackingTask: TaskSpec = {
  id: "mail_extract_tracking_info",
  split: "representative",
  domain: "Thunderbird + Note Editor",
  instruction: "Open Thunderbird, find the email for 'Order #{{orderId}}', extract the tracking number, and save it to 'tracking_info.txt'.",
  maxSteps: 15,
  seedDefaults: [0, 1, 2],

  setup: (seed: number, viewport: Viewport) => {
    const orderVariants = [
      { orderId: "9921", tracking: "AB123456" },
      { orderId: "4455", tracking: "XC789012" },
      { orderId: "7701", tracking: "ZD345678" },
    ];
    const v = orderVariants[seed % orderVariants.length];
    const envState = createBaseEnv(viewport);

    envState.appStates.mailLite["mail1"].folders = [{ id: "inbox", name: "Inbox", unread: 3 }];
    envState.appStates.mailLite["mail1"].messages = [
      { id: "msg-d1", folderId: "inbox", sender: "promo@shop.com", subject: "Sale 50% Off", preview: "Don't miss out!", body: ["Sale ends today."] },
      { id: `msg-target-${seed}`, folderId: "inbox", sender: "support@shop.com", subject: `Order #${v.orderId}`, preview: "Your order has shipped.", body: ["Your order is on the way.", `Tracking: ${v.tracking}`] },
      { id: "msg-d2", folderId: "inbox", sender: "spam@spam.com", subject: "Win a free phone", preview: "Click here to win.", body: ["You are a winner."] }
    ];

    return { envState, targets: { targetNoteName: "tracking_info.txt", targetText: v.tracking } };
  },
  goalPredicates: ["note.saved"],
  progressPredicates: ["mail.message_opened", "note.target_appended"],
  forbiddenPredicates: []
};

// Task 9: [Folder 다변화] Spam 폴더에서 발신자 추출 [representative]
// seed variation: 발신자 주소, 파일명
// forbiddenPredicates: inbox 먼저 열면 안 됨
export const mailExtractSpamSenderTask: TaskSpec = {
  id: "mail_extract_spam_sender",
  split: "representative",
  domain: "Thunderbird + Note Editor",
  instruction: "Open Thunderbird, go to the 'Spam' folder, find the 'Important Tax Document' email, extract the sender's address, and save it to 'tax_sender.txt'.",
  maxSteps: 15,
  seedDefaults: [0, 1, 2],

  setup: (seed: number, viewport: Viewport) => {
    const senders = [
      "tax@irs-mock.gov",
      "refund@tax-mock.org",
      "notice@revenue-mock.com",
    ];
    const sender = senders[seed % senders.length];
    const envState = createBaseEnv(viewport);

    envState.appStates.mailLite["mail1"].folders = [
      { id: "inbox", name: "Inbox", unread: 0 },
      { id: "spam", name: "Spam", unread: 1 }
    ];
    envState.appStates.mailLite["mail1"].messages = [{
      id: `msg-tax-${seed}`,
      folderId: "spam",
      sender,
      subject: "Important Tax Document",
      preview: "Please review the attached document.",
      body: ["This message was flagged as spam.", `Sender: ${sender}`, "Please whitelist this address."]
    }];

    return { envState, targets: { targetNoteName: "tax_sender.txt", targetText: sender } };
  },
  goalPredicates: ["note.saved"],
  progressPredicates: ["mail.message_opened", "note.target_appended"],
  forbiddenPredicates: []
};

// Task 10: 2FA 보안 코드 추출 [representative]
// seed variation: 6자리 코드
export const mailExtract2faCodeTask: TaskSpec = {
  id: "mail_extract_2fa_code",
  split: "representative",
  domain: "Thunderbird + Note Editor",
  instruction: "Open Thunderbird, locate the 'Your 2FA Code' email, extract the 6-digit code, and save it to '2fa.txt'.",
  maxSteps: 12,
  seedDefaults: [0, 1, 2],

  setup: (seed: number, viewport: Viewport) => {
    const codes = ["849201", "372910", "561083"];
    const code = codes[seed % codes.length];
    const envState = createBaseEnv(viewport);

    envState.appStates.mailLite["mail1"].folders = [{ id: "inbox", name: "Inbox", unread: 1 }];
    envState.appStates.mailLite["mail1"].messages = [{
      id: `msg-2fa-${seed}`,
      folderId: "inbox",
      sender: "auth@osmock.com",
      subject: "Your 2FA Code",
      preview: "Use this code to log in.",
      body: ["Hello,", "Here is your temporary login code:", code, "It expires in 10 minutes."]
    }];

    return { envState, targets: { targetNoteName: "2fa.txt", targetText: code } };
  },
  goalPredicates: ["note.saved"],
  progressPredicates: ["mail.message_opened", "note.target_appended"],
  forbiddenPredicates: []
};


// ============================================================================
// [Terminal Family 확장] Task 11 ~ 15
// ============================================================================

// Task 11: .env 파일에서 DB 비밀번호 추출 [representative]
// seed variation: 비밀번호, 포트
export const terminalCatEnvPasswordTask: TaskSpec = {
  id: "terminal_cat_env_password",
  split: "representative",
  domain: "Terminal + Note Editor",
  instruction: "Open Terminal, use 'cat' to read the '.env' file, copy the DB_PASSWORD value, and save it to 'db_pass.txt'.",
  maxSteps: 15,
  seedDefaults: [0, 1, 2],

  setup: (seed: number, viewport: Viewport) => {
    const passwords = ["supersecret99", "p@ssw0rd2026", "db_secure_key!"];
    const ports = ["3000", "5432", "8080"];
    const pw = passwords[seed % passwords.length];
    const port = ports[seed % ports.length];
    const cwd = "/var/www/project";
    const envState = createBaseEnv(viewport);

    envState.fileSystem.cwd = cwd;
    envState.appStates.terminalLite["terminal1"].cwd = cwd;
    envState.fileSystem.files = {
      ".env": { id: "f-env", name: ".env", path: `${cwd}/.env`, content: `DB_USER=admin\nDB_PASSWORD=${pw}\nPORT=${port}` }
    };
    envState.fileSystem.order = [".env"];

    return { envState, targets: { targetNoteName: "db_pass.txt", targetText: pw } };
  },
  goalPredicates: ["note.saved"],
  progressPredicates: ["terminal.command_ran", "note.target_appended"],
  forbiddenPredicates: []
};

// Task 12: 로그 파일에서 에러 코드 추출 [representative]
// seed variation: 에러 코드 종류
export const terminalCatLogErrorCodeTask: TaskSpec = {
  id: "terminal_cat_log_error_code",
  split: "representative",
  domain: "Terminal + Note Editor",
  instruction: "Open Terminal, 'cat' the 'error.log' file, find the specific error code, and save it to 'last_error.txt'.",
  maxSteps: 15,
  seedDefaults: [0, 1, 2],

  setup: (seed: number, viewport: Viewport) => {
    const errorCodes = ["ERR_CONNECTION_REFUSED", "ERR_TIMEOUT", "ERR_NOT_FOUND"];
    const errorCode = errorCodes[seed % errorCodes.length];
    const cwd = "/var/log/nginx";
    const envState = createBaseEnv(viewport);

    envState.fileSystem.cwd = cwd;
    envState.appStates.terminalLite["terminal1"].cwd = cwd;
    envState.fileSystem.files = {
      "error.log": { id: "f-log", name: "error.log", path: `${cwd}/error.log`, content: `[INFO] Server started\n[ERROR] Code: ${errorCode}\n[INFO] Restarting` }
    };
    envState.fileSystem.order = ["error.log"];

    return { envState, targets: { targetNoteName: "last_error.txt", targetText: errorCode } };
  },
  goalPredicates: ["note.saved"],
  progressPredicates: ["terminal.command_ran", "note.target_appended"],
  forbiddenPredicates: []
};

// Task 13: 특수 디렉토리에서 ls 결과 저장 [representative]
// seed variation: 디렉토리, 파일 목록
// 개선: targetText를 "\n" 구분으로 통일
export const terminalListLogDirTask: TaskSpec = {
  id: "terminal_list_log_directory",
  split: "representative",
  domain: "Terminal + Note Editor",
  instruction: "Open Terminal, run 'ls' to see the files in the current directory, and save the output to 'log_files.txt'.",
  maxSteps: 15,
  seedDefaults: [0, 1, 2],

  setup: (seed: number, viewport: Viewport) => {
    const dirVariants = [
      { cwd: "/var/log", files: ["syslog", "auth.log"] },
      { cwd: "/var/log/nginx", files: ["access.log", "error.log"] },
      { cwd: "/var/log/app", files: ["app.log", "debug.log", "warn.log"] },
    ];
    const v = dirVariants[seed % dirVariants.length];
    const envState = createBaseEnv(viewport);

    envState.fileSystem.cwd = v.cwd;
    envState.appStates.terminalLite["terminal1"].cwd = v.cwd;
    envState.fileSystem.files = Object.fromEntries(
      v.files.map((name, i) => [name, { id: `f-log${i}`, name, path: `${v.cwd}/${name}`, content: "" }])
    );
    envState.fileSystem.order = v.files;

    return { envState, targets: { targetNoteName: "log_files.txt", targetText: v.files.join("\n") } };
  },
  goalPredicates: ["note.saved"],
  progressPredicates: ["terminal.command_ran", "note.target_appended"],
  forbiddenPredicates: []
};

// Task 14: CSV 파일에서 관리자 이메일 추출 [representative]
// seed variation: 이메일 주소
export const terminalCatCsvEmailTask: TaskSpec = {
  id: "terminal_cat_csv_email",
  split: "representative",
  domain: "Terminal + Note Editor",
  instruction: "Open Terminal, 'cat users.csv', extract the email address of the admin user, and save it to 'admin_email.txt'.",
  maxSteps: 15,
  seedDefaults: [0, 1, 2],

  setup: (seed: number, viewport: Viewport) => {
    const adminEmails = ["admin@osmock.local", "root@osmock.local", "sysadmin@osmock.local"];
    const email = adminEmails[seed % adminEmails.length];
    const cwd = "/home/user/data";
    const envState = createBaseEnv(viewport);

    envState.fileSystem.cwd = cwd;
    envState.appStates.terminalLite["terminal1"].cwd = cwd;
    envState.fileSystem.files = {
      "users.csv": { id: "f-csv", name: "users.csv", path: `${cwd}/users.csv`, content: `role,email,id\nadmin,${email},1\nguest,guest@osmock.local,2` }
    };
    envState.fileSystem.order = ["users.csv"];

    return { envState, targets: { targetNoteName: "admin_email.txt", targetText: email } };
  },
  goalPredicates: ["note.saved"],
  progressPredicates: ["terminal.command_ran", "note.target_appended"],
  forbiddenPredicates: []
};

// Task 15: [히스토리 노이즈] 복잡한 경로에서 pwd 기록 [representative]
// seed variation: 경로, 히스토리 내용
export const terminalRecordDeepPwdTask: TaskSpec = {
  id: "terminal_record_deep_pwd",
  split: "representative",
  domain: "Terminal + Note Editor",
  instruction: "Open Terminal, run 'pwd', and save the absolute path into a note named 'current_path.txt'.",
  maxSteps: 12,
  seedDefaults: [0, 1, 2],

  setup: (seed: number, viewport: Viewport) => {
    const pathVariants = [
      { path: "/home/user/deep/nested/folder/src/app", history: ["cd /home/user", "ls -la", "cd deep/nested/folder/src/app", "npm run build"] },
      { path: "/var/www/html/backend/src/controllers", history: ["cd /var/www", "ls", "cd html/backend/src/controllers", "cat index.ts"] },
      { path: "/opt/services/os-mock/dist/lib", history: ["cd /opt", "ls -la", "cd services/os-mock/dist/lib", "node server.js"] },
    ];
    const v = pathVariants[seed % pathVariants.length];
    const envState = createBaseEnv(viewport);

    envState.fileSystem.cwd = v.path;
    envState.appStates.terminalLite["terminal1"].cwd = v.path;
    envState.appStates.terminalLite["terminal1"].executedCommands = v.history;
    envState.appStates.terminalLite["terminal1"].lines = v.history.map(cmd => `user@os-mock:~$ ${cmd}`);

    return { envState, targets: { targetNoteName: "current_path.txt", targetText: v.path } };
  },
  goalPredicates: ["note.saved"],
  progressPredicates: ["terminal.command_ran", "note.target_appended"],
  forbiddenPredicates: []
};


// ============================================================================
// [Mail Family 심화] Task 16 ~ 20
// ============================================================================

// Task 16: Trash 폴더에서 Zoom 링크 복구 [representative]
// seed variation: 링크 ID
// forbiddenPredicates: inbox를 먼저 열면 안 됨
export const mailExtractTrashLinkTask: TaskSpec = {
  id: "mail_extract_trash_link",
  split: "representative",
  domain: "Thunderbird + Note Editor",
  instruction: "Open Thunderbird, navigate to the 'Trash' folder, find the 'Canceled: Sync' email, extract the Zoom link, and save it to 'recovered_link.txt'.",
  maxSteps: 15,
  seedDefaults: [0, 1, 2],

  setup: (seed: number, viewport: Viewport) => {
    const linkIds = ["99887766", "11223344", "55667788"];
    const linkId = linkIds[seed % linkIds.length];
    const envState = createBaseEnv(viewport);

    envState.appStates.mailLite["mail1"].folders = [
      { id: "inbox", name: "Inbox", unread: 0 },
      { id: "trash", name: "Trash", unread: 1 }
    ];
    envState.appStates.mailLite["mail1"].messages = [{
      id: `msg-trash-${seed}`,
      folderId: "trash",
      sender: "system@osmock.local",
      subject: "Canceled: Sync",
      preview: "The meeting has been canceled.",
      body: ["Event canceled.", `Original link: https://zoom.us/j/${linkId}`, "Do not join."]
    }];

    return { envState, targets: { targetNoteName: "recovered_link.txt", targetText: `https://zoom.us/j/${linkId}` } };
  },
  goalPredicates: ["note.saved"],
  progressPredicates: ["mail.message_opened", "note.target_appended"],
  forbiddenPredicates: []
};

// Task 17: [함정] 영수증에서 Total만 정확히 추출 [eval]
// seed variation: 소계/세금/합계 금액 조합
export const mailExtractMessyReceiptTask: TaskSpec = {
  id: "mail_extract_messy_receipt_total",
  split: "representative",
  domain: "Thunderbird + Note Editor",
  instruction: "Open Thunderbird, find the 'Your Receipt' email, extract the FINAL Total cost (not subtotal or tax), and save it to 'receipt_total.txt'.",
  maxSteps: 15,
  seedDefaults: [0, 1, 2],

  setup: (seed: number, viewport: Viewport) => {
    const receiptVariants = [
      { subtotal: "$1200.00", tax: "$96.00", total: "$1296.00" },
      { subtotal: "$850.00", tax: "$68.00", total: "$918.00" },
      { subtotal: "$2400.00", tax: "$192.00", total: "$2592.00" },
    ];
    const v = receiptVariants[seed % receiptVariants.length];
    const envState = createBaseEnv(viewport);

    envState.appStates.mailLite["mail1"].folders = [{ id: "inbox", name: "Inbox", unread: 1 }];
    envState.appStates.mailLite["mail1"].messages = [{
      id: `msg-receipt-${seed}`,
      folderId: "inbox",
      sender: "store@shop.com",
      subject: "Your Receipt",
      preview: "Thank you for your purchase.",
      body: ["=== RECEIPT ===", `Subtotal: ${v.subtotal}`, `Tax (8%): ${v.tax}`, "-----------------", `Total: ${v.total}`, "Thank you!"]
    }];

    return { envState, targets: { targetNoteName: "receipt_total.txt", targetText: v.total } };
  },
  goalPredicates: ["note.saved"],
  progressPredicates: ["mail.message_opened", "note.target_appended"],
  forbiddenPredicates: []
};

// Task 18: 항공편 예약 번호(PNR) 추출 [representative]
// seed variation: PNR 코드, 항공편 번호
export const mailExtractFlightPnrTask: TaskSpec = {
  id: "mail_extract_flight_pnr",
  split: "representative",
  domain: "Thunderbird + Note Editor",
  instruction: "Open Thunderbird, locate the 'Flight Confirmation' email, extract the 6-character booking reference (PNR), and save it to 'flight_pnr.txt'.",
  maxSteps: 12,
  seedDefaults: [0, 1, 2],

  setup: (seed: number, viewport: Viewport) => {
    const flightVariants = [
      { pnr: "X7Y8Z9", flight: "SK123", dest: "NRT" },
      { pnr: "A1B2C3", flight: "KE456", dest: "LAX" },
      { pnr: "P9Q8R7", flight: "OZ789", dest: "CDG" },
    ];
    const v = flightVariants[seed % flightVariants.length];
    const envState = createBaseEnv(viewport);

    envState.appStates.mailLite["mail1"].folders = [{ id: "inbox", name: "Inbox", unread: 1 }];
    envState.appStates.mailLite["mail1"].messages = [{
      id: `msg-flight-${seed}`,
      folderId: "inbox",
      sender: "airlines@sky.com",
      subject: "Flight Confirmation",
      preview: `Your flight to ${v.dest} is confirmed.`,
      body: ["Booking Confirmed!", "Passenger: J. Doe", `Booking Reference (PNR): ${v.pnr}`, `Flight: ${v.flight} to ${v.dest}`, "Have a safe trip."]
    }];

    return { envState, targets: { targetNoteName: "flight_pnr.txt", targetText: v.pnr } };
  },
  goalPredicates: ["note.saved"],
  progressPredicates: ["mail.message_opened", "note.target_appended"],
  forbiddenPredicates: []
};

// Task 19: 버그 리포트 메일에서 Exception 이름 추출 [representative]
// seed variation: 예외 이름
export const mailExtractExceptionNameTask: TaskSpec = {
  id: "mail_extract_exception_name",
  split: "representative",
  domain: "Thunderbird + Note Editor",
  instruction: "Open Thunderbird, read the 'Production Crash Report' email, extract the exact Exception name, and save it to 'bug_type.txt'.",
  maxSteps: 12,
  seedDefaults: [0, 1, 2],

  setup: (seed: number, viewport: Viewport) => {
    const exceptions = ["NullPointerException", "IndexOutOfBoundsException", "StackOverflowError"];
    const exc = exceptions[seed % exceptions.length];
    const envState = createBaseEnv(viewport);

    envState.appStates.mailLite["mail1"].folders = [{ id: "inbox", name: "Inbox", unread: 1 }];
    envState.appStates.mailLite["mail1"].messages = [{
      id: `msg-crash-${seed}`,
      folderId: "inbox",
      sender: "monitor@osmock.local",
      subject: "Production Crash Report",
      preview: "Alert: App crashed at 02:00 AM.",
      body: ["Log snippet:", "at main.js:42", `Uncaught Java.lang.${exc}`, "Process exited with code 1."]
    }];

    return { envState, targets: { targetNoteName: "bug_type.txt", targetText: exc } };
  },
  goalPredicates: ["note.saved"],
  progressPredicates: ["mail.message_opened", "note.target_appended"],
  forbiddenPredicates: []
};

// Task 20: 서버 SSH 접근 IP 추출 [representative]
// seed variation: IP 주소
export const mailExtractSshIpTask: TaskSpec = {
  id: "mail_extract_ssh_ip",
  split: "representative",
  domain: "Thunderbird + Note Editor",
  instruction: "Open Thunderbird, find the 'New Server Credentials' email, extract the IP address, and save it to 'server_ip.txt'.",
  maxSteps: 12,
  seedDefaults: [0, 1, 2],

  setup: (seed: number, viewport: Viewport) => {
    const ips = ["192.168.1.105", "10.0.0.42", "172.16.5.200"];
    const ip = ips[seed % ips.length];
    const envState = createBaseEnv(viewport);

    envState.appStates.mailLite["mail1"].folders = [{ id: "inbox", name: "Inbox", unread: 1 }];
    envState.appStates.mailLite["mail1"].messages = [{
      id: `msg-server-${seed}`,
      folderId: "inbox",
      sender: "devops@osmock.local",
      subject: "New Server Credentials",
      preview: "Your new dev environment is ready.",
      body: ["Here are your connection details:", `Host: ${ip}`, "User: root", "Port: 22", "Please change the default password."]
    }];

    return { envState, targets: { targetNoteName: "server_ip.txt", targetText: ip } };
  },
  goalPredicates: ["note.saved"],
  progressPredicates: ["mail.message_opened", "note.target_appended"],
  forbiddenPredicates: []
};


// ============================================================================
// [Terminal Family 심화] Task 21 ~ 25
// ============================================================================

// Task 21: 숨김 파일(.credentials)에서 API Key 추출 [representative]
// seed variation: API Key 값, 서비스명
export const terminalCatHiddenCredentialsTask: TaskSpec = {
  id: "terminal_cat_hidden_credentials",
  split: "representative",
  domain: "Terminal + Note Editor",
  instruction: "Open Terminal, use 'cat' to read the hidden '.credentials' file, and copy the API key into 'secret_api_key.txt'. Save the note.",
  maxSteps: 15,
  seedDefaults: [0, 1, 2],

  setup: (seed: number, viewport: Viewport) => {
    const credVariants = [
      { key: "AIzaSyD4_test_fake_key_99", service: "GEMINI_API_KEY" },
      { key: "sk-proj-fakekey_openai_001", service: "OPENAI_API_KEY" },
      { key: "xoxb-fake-slack-token-xyz", service: "SLACK_BOT_TOKEN" },
    ];
    const v = credVariants[seed % credVariants.length];
    const cwd = "/home/user/.config";
    const envState = createBaseEnv(viewport);

    envState.fileSystem.cwd = cwd;
    envState.appStates.terminalLite["terminal1"].cwd = cwd;
    envState.fileSystem.files = {
      ".credentials": { id: "f-cred", name: ".credentials", path: `${cwd}/.credentials`, content: `${v.service}=${v.key}\nAWS_KEY=AKIA123` }
    };
    envState.fileSystem.order = [".credentials"];

    return { envState, targets: { targetNoteName: "secret_api_key.txt", targetText: v.key } };
  },
  goalPredicates: ["note.saved"],
  progressPredicates: ["terminal.command_ran", "note.target_appended"],
  forbiddenPredicates: []
};

// Task 22: ls로 숨김 파일 포함 목록 파악 [representative]
// seed variation: 파일 목록 구성
// 개선: targetText를 "\n" 구분으로 통일 / ls만 지원 가정
export const terminalListHiddenFilesTask: TaskSpec = {
  id: "terminal_list_hidden_files",
  split: "representative",
  domain: "Terminal + Note Editor",
  instruction: "Open Terminal, run 'ls' to list all files in the current directory (including hidden ones), and save the output to 'hidden_files.txt'.",
  maxSteps: 15,
  seedDefaults: [0, 1, 2],

  setup: (seed: number, viewport: Viewport) => {
    const fileVariants = [
      [".env", ".gitignore", "main.ts"],
      [".credentials", ".npmrc", "index.ts"],
      [".env.local", ".dockerignore", "app.ts"],
    ];
    const files = fileVariants[seed % fileVariants.length];
    const cwd = "/home/user/project";
    const envState = createBaseEnv(viewport);

    envState.fileSystem.cwd = cwd;
    envState.appStates.terminalLite["terminal1"].cwd = cwd;
    envState.fileSystem.files = Object.fromEntries(
      files.map((name, i) => [name, { id: `f-h${i}`, name, path: `${cwd}/${name}`, content: "" }])
    );
    envState.fileSystem.order = files;

    return { envState, targets: { targetNoteName: "hidden_files.txt", targetText: files.join("\n") } };
  },
  goalPredicates: ["note.saved"],
  progressPredicates: ["terminal.command_ran", "note.target_appended"],
  forbiddenPredicates: []
};

// Task 23: 중첩 JSON에서 특정 값 추출 [eval]
// seed variation: 포트 번호, 중첩 키
export const terminalCatJsonNestedTask: TaskSpec = {
  id: "terminal_cat_json_nested",
  split: "representative",
  domain: "Terminal + Note Editor",
  instruction: "Open Terminal, 'cat config.json', find the port number inside the 'database' object, and save it to 'db_port.txt'.",
  maxSteps: 15,
  seedDefaults: [0, 1, 2],

  setup: (seed: number, viewport: Viewport) => {
    const dbPorts = ["5432", "3306", "27017"];
    const serverPorts = ["80", "8080", "443"];
    const dbPort = dbPorts[seed % dbPorts.length];
    const serverPort = serverPorts[seed % serverPorts.length];
    const cwd = "/etc/app";
    const envState = createBaseEnv(viewport);

    envState.fileSystem.cwd = cwd;
    envState.appStates.terminalLite["terminal1"].cwd = cwd;
    envState.fileSystem.files = {
      "config.json": {
        id: "f-conf",
        name: "config.json",
        path: `${cwd}/config.json`,
        content: `{\n  "server": {"port": ${serverPort}},\n  "database": {"host": "localhost", "port": ${dbPort}}\n}`
      }
    };
    envState.fileSystem.order = ["config.json"];

    return { envState, targets: { targetNoteName: "db_port.txt", targetText: dbPort } };
  },
  goalPredicates: ["note.saved"],
  progressPredicates: ["terminal.command_ran", "note.target_appended"],
  forbiddenPredicates: []
};

// Task 24: 파이썬 소스코드에서 import 모듈명 추출 [representative]
// seed variation: 라이브러리명
export const terminalCatPythonImportTask: TaskSpec = {
  id: "terminal_cat_python_import",
  split: "representative",
  domain: "Terminal + Note Editor",
  instruction: "Open Terminal, read 'main.py' using 'cat', extract the name of the library being imported, and save it to 'imported_module.txt'.",
  maxSteps: 15,
  seedDefaults: [0, 1, 2],

  setup: (seed: number, viewport: Viewport) => {
    const libraryVariants = [
      { lib: "tensorflow", alias: "tf", desc: "Model initialized" },
      { lib: "numpy", alias: "np", desc: "Array created" },
      { lib: "pandas", alias: "pd", desc: "DataFrame loaded" },
    ];
    const v = libraryVariants[seed % libraryVariants.length];
    const cwd = "/home/user/ai_project";
    const envState = createBaseEnv(viewport);

    envState.fileSystem.cwd = cwd;
    envState.appStates.terminalLite["terminal1"].cwd = cwd;
    envState.fileSystem.files = {
      "main.py": { id: "f-py", name: "main.py", path: `${cwd}/main.py`, content: `import ${v.lib} as ${v.alias}\n\nprint('${v.desc}')\n` }
    };
    envState.fileSystem.order = ["main.py"];

    return { envState, targets: { targetNoteName: "imported_module.txt", targetText: v.lib } };
  },
  goalPredicates: ["note.saved"],
  progressPredicates: ["terminal.command_ran", "note.target_appended"],
  forbiddenPredicates: []
};

// Task 25: [Distractor] 특정 확장자(.pdf) 파일명 추출 [representative]
// seed variation: distractor 파일 구성, pdf 파일명
export const terminalFindSpecificExtensionTask: TaskSpec = {
  id: "terminal_find_specific_extension",
  split: "representative",
  domain: "Terminal + Note Editor",
  instruction: "Open Terminal, run 'ls', find the exact name of the PDF file among the listed items, and save its name to 'target_file.txt'.",
  maxSteps: 15,
  seedDefaults: [0, 1, 2],

  setup: (seed: number, viewport: Viewport) => {
    const pdfVariants = [
      { pdf: "report_final_v3.pdf", others: ["image.png", "archive.zip"] },
      { pdf: "contract_signed.pdf", others: ["logo.jpg", "data.csv"] },
      { pdf: "invoice_q2.pdf", others: ["notes.txt", "backup.tar.gz"] },
    ];
    const v = pdfVariants[seed % pdfVariants.length];
    const allFiles = [...v.others, v.pdf];
    const cwd = "/home/user/downloads";
    const envState = createBaseEnv(viewport);

    envState.fileSystem.cwd = cwd;
    envState.appStates.terminalLite["terminal1"].cwd = cwd;
    envState.fileSystem.files = Object.fromEntries(
      allFiles.map((name, i) => [name, { id: `f${i}`, name, path: `${cwd}/${name}`, content: "" }])
    );
    envState.fileSystem.order = allFiles;

    return { envState, targets: { targetNoteName: "target_file.txt", targetText: v.pdf } };
  },
  goalPredicates: ["note.saved"],
  progressPredicates: ["terminal.command_ran", "note.target_appended"],
  forbiddenPredicates: []
};


// ============================================================================
// [Mail Family 극한] Task 26 ~ 30
// ============================================================================

// Task 26: [문맥 파악] 취소 수수료만 정확히 추출 [eval]
// seed variation: 원금, 수수료, 환불액 조합
export const mailExtractCancellationFeeTask: TaskSpec = {
  id: "mail_extract_cancellation_fee",
  split: "representative",
  domain: "Thunderbird + Note Editor",
  instruction: "Open Thunderbird, find the 'Re: Refund Request' email. Extract ONLY the cancellation fee amount, and save it to 'fee_amount.txt'.",
  maxSteps: 15,
  seedDefaults: [0, 1, 2],

  setup: (seed: number, viewport: Viewport) => {
    const feeVariants = [
      { original: "$100.00", fee: "$15.00", refund: "$85.00" },
      { original: "$250.00", fee: "$30.00", refund: "$220.00" },
      { original: "$500.00", fee: "$50.00", refund: "$450.00" },
    ];
    const v = feeVariants[seed % feeVariants.length];
    const envState = createBaseEnv(viewport);

    envState.appStates.mailLite["mail1"].folders = [{ id: "inbox", name: "Inbox", unread: 1 }];
    envState.appStates.mailLite["mail1"].messages = [{
      id: `msg-refund-${seed}`,
      folderId: "inbox",
      sender: "support@osmock.local",
      subject: "Re: Refund Request",
      preview: `Regarding your refund of ${v.original}...`,
      body: [`> I want a refund for my ${v.original} ticket.`, "", "Hello,", `We can process the ${v.original} refund.`, `However, a cancellation fee of ${v.fee} applies.`, `Total refunded: ${v.refund}.`]
    }];

    return { envState, targets: { targetNoteName: "fee_amount.txt", targetText: v.fee } };
  },
  goalPredicates: ["note.saved"],
  progressPredicates: ["mail.message_opened", "note.target_appended"],
  forbiddenPredicates: []
};

// Task 27: 발신자 기준 검색으로 전화번호 추출 [representative]
// seed variation: 발신자, 전화번호
export const mailExtractHrPhoneTask: TaskSpec = {
  id: "mail_extract_hr_phone",
  split: "representative",
  domain: "Thunderbird + Note Editor",
  instruction: "Open Thunderbird, find the email sent by 'hr@osmock.local', extract their contact phone number, and save it to 'hr_phone.txt'.",
  maxSteps: 15,
  seedDefaults: [0, 1, 2],

  setup: (seed: number, viewport: Viewport) => {
    const phoneVariants = ["555-0199", "555-0312", "555-0487"];
    const phone = phoneVariants[seed % phoneVariants.length];
    const envState = createBaseEnv(viewport);

    envState.appStates.mailLite["mail1"].folders = [{ id: "inbox", name: "Inbox", unread: 2 }];
    envState.appStates.mailLite["mail1"].messages = [
      { id: "msg-d1", folderId: "inbox", sender: "marketing@osmock.local", subject: "Welcome!", preview: "Call 555-0000", body: ["Call 555-0000"] },
      { id: `msg-hr-${seed}`, folderId: "inbox", sender: "hr@osmock.local", subject: "Onboarding Info", preview: "Welcome to the team.", body: ["Welcome!", `If you have questions, call HR at ${phone}.`, "Best."] }
    ];

    return { envState, targets: { targetNoteName: "hr_phone.txt", targetText: phone } };
  },
  goalPredicates: ["note.saved"],
  progressPredicates: ["mail.message_opened", "note.target_appended"],
  forbiddenPredicates: []
};

// Task 28: Drafts 폴더에서 미전송 수신자 추출 [representative]
// seed variation: 수신자 주소
// forbiddenPredicates: inbox를 먼저 열면 안 됨
export const mailExtractDraftRecipientTask: TaskSpec = {
  id: "mail_extract_draft_recipient",
  split: "representative",
  domain: "Thunderbird + Note Editor",
  instruction: "Open Thunderbird, go to the 'Drafts' folder, check the unsent 'Q3 Report' email, extract the recipient's email address, and save it to 'draft_target.txt'.",
  maxSteps: 15,
  seedDefaults: [0, 1, 2],

  setup: (seed: number, viewport: Viewport) => {
    const recipients = ["investors@osmock.com", "board@osmock.com", "cfo@osmock.com"];
    const recipient = recipients[seed % recipients.length];
    const envState = createBaseEnv(viewport);

    envState.appStates.mailLite["mail1"].folders = [
      { id: "inbox", name: "Inbox", unread: 0 },
      { id: "drafts", name: "Drafts", unread: 1 }
    ];
    envState.appStates.mailLite["mail1"].messages = [{
      id: `msg-draft-${seed}`,
      folderId: "drafts",
      sender: "me@osmock.local",
      subject: "Q3 Report",
      preview: `Draft to: ${recipient}`,
      body: [`To: ${recipient}`, "Subject: Q3 Report", "", "Please find the attached report."]
    }];

    return { envState, targets: { targetNoteName: "draft_target.txt", targetText: recipient } };
  },
  goalPredicates: ["note.saved"],
  progressPredicates: ["mail.message_opened", "note.target_appended"],
  forbiddenPredicates: []
};

// Task 29: 프로모션 코드 추출 [representative]
// seed variation: 프로모션 코드, 할인율
export const mailExtractPromoCodeTask: TaskSpec = {
  id: "mail_extract_promo_code",
  split: "representative",
  domain: "Thunderbird + Note Editor",
  instruction: "Open Thunderbird, read the 'Summer Sale' email, extract the discount promo code, and save it to 'promo_code.txt'.",
  maxSteps: 12,
  seedDefaults: [0, 1, 2],

  setup: (seed: number, viewport: Viewport) => {
    const promoVariants = [
      { code: "SUMMER50", discount: "50%" },
      { code: "FLASH30", discount: "30%" },
      { code: "VIP20", discount: "20%" },
    ];
    const v = promoVariants[seed % promoVariants.length];
    const envState = createBaseEnv(viewport);

    envState.appStates.mailLite["mail1"].folders = [{ id: "inbox", name: "Inbox", unread: 1 }];
    envState.appStates.mailLite["mail1"].messages = [{
      id: `msg-promo-${seed}`,
      folderId: "inbox",
      sender: "sales@shop.com",
      subject: "Summer Sale",
      preview: `Get ${v.discount} off today!`,
      body: ["Over 10,000 items on sale!", `Save ${v.discount} on everything.`, `Use code: ${v.code} at checkout.`, "Valid until 2026-08-31."]
    }];

    return { envState, targets: { targetNoteName: "promo_code.txt", targetText: v.code } };
  },
  goalPredicates: ["note.saved"],
  progressPredicates: ["mail.message_opened", "note.target_appended"],
  forbiddenPredicates: []
};

// Task 30: 'Action Required' 메일에서 기한(Deadline) 날짜 추출 [representative]
// seed variation: 기한 날짜
export const mailExtractDeadlineTask: TaskSpec = {
  id: "mail_extract_deadline",
  split: "representative",
  domain: "Thunderbird + Note Editor",
  instruction: "Open Thunderbird, locate the 'Action Required' email, extract the exact deadline date, and save it to 'deadline.txt'.",
  maxSteps: 12,
  seedDefaults: [0, 1, 2],

  setup: (seed: number, viewport: Viewport) => {
    const deadlines = ["October 31st", "November 15th", "December 1st"];
    const deadline = deadlines[seed % deadlines.length];
    const envState = createBaseEnv(viewport);

    envState.appStates.mailLite["mail1"].folders = [{ id: "inbox", name: "Inbox", unread: 1 }];
    envState.appStates.mailLite["mail1"].messages = [{
      id: `msg-action-${seed}`,
      folderId: "inbox",
      sender: "compliance@osmock.local",
      subject: "Action Required: Training",
      preview: "Please complete your mandatory training.",
      body: ["Hello,", "You have pending mandatory training modules.", `Deadline: ${deadline}.`, "Thank you."]
    }];

    return { envState, targets: { targetNoteName: "deadline.txt", targetText: deadline } };
  },
  goalPredicates: ["note.saved"],
  progressPredicates: ["mail.message_opened", "note.target_appended"],
  forbiddenPredicates: []
};


// ============================================================================
// [Terminal Family 극한] Task 31 ~ 35
// ============================================================================

// Task 31: CSV에서 특정 사용자(Alice) ID 파싱 [eval]
// seed variation: 타겟 이름, ID 값
export const terminalCatCsvSpecificValueTask: TaskSpec = {
  id: "terminal_cat_csv_specific_value",
  split: "representative",
  domain: "Terminal + Note Editor",
  instruction: "Open Terminal, read 'employees.csv', find the employee ID for 'Alice', and save it to 'alice_id.txt'.",
  maxSteps: 15,
  seedDefaults: [0, 1, 2],

  setup: (seed: number, viewport: Viewport) => {
    const aliceIds = ["EMP-042", "EMP-117", "EMP-233"];
    const aliceId = aliceIds[seed % aliceIds.length];
    const cwd = "/home/user/hr";
    const envState = createBaseEnv(viewport);

    envState.fileSystem.cwd = cwd;
    envState.appStates.terminalLite["terminal1"].cwd = cwd;
    envState.fileSystem.files = {
      "employees.csv": {
        id: "f-csv2",
        name: "employees.csv",
        path: `${cwd}/employees.csv`,
        content: `name,department,id\nBob,Sales,EMP-041\nAlice,Engineering,${aliceId}\nCharlie,HR,EMP-043`
      }
    };
    envState.fileSystem.order = ["employees.csv"];

    return { envState, targets: { targetNoteName: "alice_id.txt", targetText: aliceId } };
  },
  goalPredicates: ["note.saved"],
  progressPredicates: ["terminal.command_ran", "note.target_appended"],
  forbiddenPredicates: []
};

// Task 32: .gitignore에서 첫 번째 ignored 디렉토리 추출 [representative]
// seed variation: 무시 목록 순서
export const terminalCatGitignoreTask: TaskSpec = {
  id: "terminal_cat_gitignore",
  split: "representative",
  domain: "Terminal + Note Editor",
  instruction: "Open Terminal, 'cat .gitignore', extract the first directory listed (the one starting with 'node_'), and save it to 'ignored_dir.txt'.",
  maxSteps: 15,
  seedDefaults: [0, 1, 2],

  setup: (seed: number, viewport: Viewport) => {
    const gitignoreVariants = [
      { content: "node_modules/\n.env\ndist/\nbuild/", target: "node_modules/" },
      { content: "node_cache/\n.env.local\nout/\ncoverage/", target: "node_cache/" },
      { content: "node_packages/\n.DS_Store\nstatic/\n.tmp/", target: "node_packages/" },
    ];
    const v = gitignoreVariants[seed % gitignoreVariants.length];
    const cwd = "/home/user/project";
    const envState = createBaseEnv(viewport);

    envState.fileSystem.cwd = cwd;
    envState.appStates.terminalLite["terminal1"].cwd = cwd;
    envState.fileSystem.files = {
      ".gitignore": { id: "f-git2", name: ".gitignore", path: `${cwd}/.gitignore`, content: v.content }
    };
    envState.fileSystem.order = [".gitignore"];

    return { envState, targets: { targetNoteName: "ignored_dir.txt", targetText: v.target } };
  },
  goalPredicates: ["note.saved"],
  progressPredicates: ["terminal.command_ran", "note.target_appended"],
  forbiddenPredicates: []
};

// Task 33: [Distractor] backup_ 접두사 파일명 찾기 [representative]
// seed variation: 백업 파일명, distractor 구성
export const terminalFindBackupFileTask: TaskSpec = {
  id: "terminal_find_backup_file",
  split: "representative",
  domain: "Terminal + Note Editor",
  instruction: "Open Terminal, run 'ls', find the file that starts with 'backup_', and save its full name to 'latest_backup.txt'.",
  maxSteps: 15,
  seedDefaults: [0, 1, 2],

  setup: (seed: number, viewport: Viewport) => {
    const backupVariants = [
      { backup: "backup_2026_final.zip", others: ["data.txt", "old_logs.tar.gz"] },
      { backup: "backup_2025_q4.tar.gz", others: ["index.html", "config.json"] },
      { backup: "backup_db_20260101.sql", others: ["README.md", "schema.sql"] },
    ];
    const v = backupVariants[seed % backupVariants.length];
    const allFiles = [...v.others, v.backup];
    const cwd = "/var/backups";
    const envState = createBaseEnv(viewport);

    envState.fileSystem.cwd = cwd;
    envState.appStates.terminalLite["terminal1"].cwd = cwd;
    envState.fileSystem.files = Object.fromEntries(
      allFiles.map((name, i) => [name, { id: `f${i}`, name, path: `${cwd}/${name}`, content: "" }])
    );
    envState.fileSystem.order = allFiles;

    return { envState, targets: { targetNoteName: "latest_backup.txt", targetText: v.backup } };
  },
  goalPredicates: ["note.saved"],
  progressPredicates: ["terminal.command_ran", "note.target_appended"],
  forbiddenPredicates: []
};

// Task 34: package.json에서 특정 의존성(react) 버전 파싱 [eval]
// seed variation: react 버전, 다른 의존성 구성
export const terminalCatPackageJsonVersionTask: TaskSpec = {
  id: "terminal_cat_package_json_version",
  split: "representative",
  domain: "Terminal + Note Editor",
  instruction: "Open Terminal, 'cat package.json', find the installed version of 'react', and save the version string to 'react_version.txt'.",
  maxSteps: 15,
  seedDefaults: [0, 1, 2],

  setup: (seed: number, viewport: Viewport) => {
    const reactVersions = ["^18.2.0", "^17.0.2", "^18.3.1"];
    const axiosVersions = ["1.4.0", "1.6.0", "1.3.5"];
    const reactVer = reactVersions[seed % reactVersions.length];
    const axiosVer = axiosVersions[seed % axiosVersions.length];
    const cwd = "/home/user/frontend";
    const envState = createBaseEnv(viewport);

    envState.fileSystem.cwd = cwd;
    envState.appStates.terminalLite["terminal1"].cwd = cwd;
    envState.fileSystem.files = {
      "package.json": {
        id: "f-pkg",
        name: "package.json",
        path: `${cwd}/package.json`,
        content: `{\n  "name": "app",\n  "dependencies": {\n    "react": "${reactVer}",\n    "axios": "${axiosVer}"\n  }\n}`
      }
    };
    envState.fileSystem.order = ["package.json"];

    return { envState, targets: { targetNoteName: "react_version.txt", targetText: reactVer } };
  },
  goalPredicates: ["note.saved"],
  progressPredicates: ["terminal.command_ran", "note.target_appended"],
  forbiddenPredicates: []
};

// Task 35: .sh 확장자 실행 스크립트 파일명 찾기 [representative]
// seed variation: 스크립트 파일명, distractor 구성
export const terminalFindShellScriptTask: TaskSpec = {
  id: "terminal_find_shell_script",
  split: "representative",
  domain: "Terminal + Note Editor",
  instruction: "Open Terminal, list the directory contents, identify the shell script file (.sh), and save its name to 'script_name.txt'.",
  maxSteps: 15,
  seedDefaults: [0, 1, 2],

  setup: (seed: number, viewport: Viewport) => {
    const scriptVariants = [
      { script: "run_server.sh", others: ["readme.md", "config.yaml"] },
      { script: "deploy.sh", others: ["Dockerfile", "nginx.conf"] },
      { script: "setup_env.sh", others: ["requirements.txt", "Makefile"] },
    ];
    const v = scriptVariants[seed % scriptVariants.length];
    const allFiles = [...v.others, v.script];
    const cwd = "/home/user/scripts";
    const envState = createBaseEnv(viewport);

    envState.fileSystem.cwd = cwd;
    envState.appStates.terminalLite["terminal1"].cwd = cwd;
    envState.fileSystem.files = Object.fromEntries(
      allFiles.map((name, i) => [name, { id: `f${i}`, name, path: `${cwd}/${name}`, content: "" }])
    );
    envState.fileSystem.order = allFiles;

    return { envState, targets: { targetNoteName: "script_name.txt", targetText: v.script } };
  },
  goalPredicates: ["note.saved"],
  progressPredicates: ["terminal.command_ran", "note.target_appended"],
  forbiddenPredicates: []
};


// ============================================================================
// [최종 배치] Task 36 ~ 40: 실무 환경 텍스트 파싱 및 복잡한 구조
// ============================================================================

// Task 36: 프로세스 목록에서 특정 서비스 PID 추출 [eval]
// seed variation: 서비스명, PID 값
export const terminalCatProcessListTask: TaskSpec = {
  id: "terminal_cat_process_list",
  split: "representative",
  domain: "Terminal + Note Editor",
  instruction: "Open Terminal, 'cat processes.txt', find the PID for the 'nginx' service, and save it to 'nginx_pid.txt'.",
  maxSteps: 15,
  seedDefaults: [0, 1, 2],

  setup: (seed: number, viewport: Viewport) => {
    const nginxPids = ["4021", "7731", "9105"];
    const pid = nginxPids[seed % nginxPids.length];
    const cwd = "/var/run";
    const envState = createBaseEnv(viewport);

    envState.fileSystem.cwd = cwd;
    envState.appStates.terminalLite["terminal1"].cwd = cwd;
    envState.fileSystem.files = {
      "processes.txt": {
        id: "f-proc",
        name: "processes.txt",
        path: `${cwd}/processes.txt`,
        content: `USER       PID %CPU %MEM    COMMAND\nroot         1  0.0  0.1    /sbin/init\nwww-data  ${pid}  0.0  0.5    nginx: worker process\nredis     5192  0.2  1.2    redis-server`
      }
    };
    envState.fileSystem.order = ["processes.txt"];

    return { envState, targets: { targetNoteName: "nginx_pid.txt", targetText: pid } };
  },
  goalPredicates: ["note.saved"],
  progressPredicates: ["terminal.command_ran", "note.target_appended"],
  forbiddenPredicates: []
};

// Task 37: 결항 메일에서 새 항공편 번호 추출 [eval]
// seed variation: 원래 항공편, 재배정 항공편
export const mailExtractRebookedFlightTask: TaskSpec = {
  id: "mail_extract_rebooked_flight",
  split: "representative",
  domain: "Thunderbird + Note Editor",
  instruction: "Open Thunderbird, find the 'Flight Canceled' email, extract your NEW rebooked flight number, and save it to 'new_flight.txt'.",
  maxSteps: 15,
  seedDefaults: [0, 1, 2],

  setup: (seed: number, viewport: Viewport) => {
    const flightVariants = [
      { original: "AB123", rebooked: "XY987" },
      { original: "KE201", rebooked: "OZ445" },
      { original: "LH789", rebooked: "TG102" },
    ];
    const v = flightVariants[seed % flightVariants.length];
    const envState = createBaseEnv(viewport);

    envState.appStates.mailLite["mail1"].folders = [{ id: "inbox", name: "Inbox", unread: 1 }];
    envState.appStates.mailLite["mail1"].messages = [{
      id: `msg-cancel-${seed}`,
      folderId: "inbox",
      sender: "urgent@airlines.com",
      subject: "Flight Canceled",
      preview: "Important information regarding your trip.",
      body: ["Dear Passenger,", `We regret to inform you that your original flight ${v.original} has been canceled.`, `You have been automatically rebooked on flight ${v.rebooked}.`, "We apologize for the inconvenience."]
    }];

    return { envState, targets: { targetNoteName: "new_flight.txt", targetText: v.rebooked } };
  },
  goalPredicates: ["note.saved"],
  progressPredicates: ["mail.message_opened", "note.target_appended"],
  forbiddenPredicates: []
};

// Task 38: YAML 파일에서 production DB 유저명 추출 [eval]
// seed variation: dev/prod 유저명 쌍
export const terminalCatYamlConfigTask: TaskSpec = {
  id: "terminal_cat_yaml_config",
  split: "representative",
  domain: "Terminal + Note Editor",
  instruction: "Open Terminal, 'cat database.yml', extract the database username for the 'production' environment, and save it to 'prod_db_user.txt'.",
  maxSteps: 15,
  seedDefaults: [0, 1, 2],

  setup: (seed: number, viewport: Viewport) => {
    const userVariants = [
      { dev: "dev_admin", prod: "prod_admin" },
      { dev: "local_user", prod: "prod_user" },
      { dev: "test_root", prod: "prod_root" },
    ];
    const v = userVariants[seed % userVariants.length];
    const cwd = "/home/user/app/config";
    const envState = createBaseEnv(viewport);

    envState.fileSystem.cwd = cwd;
    envState.appStates.terminalLite["terminal1"].cwd = cwd;
    envState.fileSystem.files = {
      "database.yml": {
        id: "f-yaml",
        name: "database.yml",
        path: `${cwd}/database.yml`,
        content: `development:\n  user: ${v.dev}\n  pass: dev123\n\nproduction:\n  user: ${v.prod}\n  pass: super_secure_pwd!`
      }
    };
    envState.fileSystem.order = ["database.yml"];

    return { envState, targets: { targetNoteName: "prod_db_user.txt", targetText: v.prod } };
  },
  goalPredicates: ["note.saved"],
  progressPredicates: ["terminal.command_ran", "note.target_appended"],
  forbiddenPredicates: []
};

// Task 39: 긴 뉴스레터 메일 하단의 구독 취소 링크 찾기 [eval]
// seed variation: 구독 취소 링크 ID
export const mailExtractUnsubscribeLinkTask: TaskSpec = {
  id: "mail_extract_unsubscribe_link",
  split: "representative",
  domain: "Thunderbird + Note Editor",
  instruction: "Open Thunderbird, read the long 'Weekly Tech Digest' email, find the unsubscribe URL at the very bottom, and save it to 'unsubscribe.txt'.",
  maxSteps: 15,
  seedDefaults: [0, 1, 2],

  setup: (seed: number, viewport: Viewport) => {
    const unsubIds = ["999", "1024", "777"];
    const unsubId = unsubIds[seed % unsubIds.length];
    const envState = createBaseEnv(viewport);

    envState.appStates.mailLite["mail1"].folders = [{ id: "inbox", name: "Inbox", unread: 1 }];
    envState.appStates.mailLite["mail1"].messages = [{
      id: `msg-digest-${seed}`,
      folderId: "inbox",
      sender: "newsletter@tech.com",
      subject: "Weekly Tech Digest",
      preview: "Here is the latest news in tech.",
      body: [
        "Welcome to the Weekly Tech Digest!", "1. New AI model released.", "2. Quantum computing breakthrough.",
        "3. Cybersecurity updates.", "(...many more lines of news...)",
        "Thank you for reading.", `To stop receiving these emails, unsubscribe here: https://osmock.com/unsub/${unsubId}`
      ]
    }];

    return { envState, targets: { targetNoteName: "unsubscribe.txt", targetText: `https://osmock.com/unsub/${unsubId}` } };
  },
  goalPredicates: ["note.saved"],
  progressPredicates: ["mail.message_opened", "note.target_appended"],
  forbiddenPredicates: []
};

// Task 40: 인증서 만료일 추출 [eval]
// seed variation: 발급일, 만료일
export const terminalCatCertExpiryTask: TaskSpec = {
  id: "terminal_cat_cert_expiry",
  split: "representative",
  domain: "Terminal + Note Editor",
  instruction: "Open Terminal, 'cat cert_info.txt', extract the exact 'Valid Until' date, and save it to 'cert_expiry.txt'.",
  maxSteps: 15,
  seedDefaults: [0, 1, 2],

  setup: (seed: number, viewport: Viewport) => {
    const certVariants = [
      { from: "2025-01-01", until: "2027-12-31" },
      { from: "2024-06-01", until: "2026-05-31" },
      { from: "2025-03-15", until: "2028-03-14" },
    ];
    const v = certVariants[seed % certVariants.length];
    const cwd = "/etc/ssl/certs";
    const envState = createBaseEnv(viewport);

    envState.fileSystem.cwd = cwd;
    envState.appStates.terminalLite["terminal1"].cwd = cwd;
    envState.fileSystem.files = {
      "cert_info.txt": {
        id: "f-cert",
        name: "cert_info.txt",
        path: `${cwd}/cert_info.txt`,
        content: `Certificate Details:\nIssuer: Let's Encrypt Authority\nValid From: ${v.from}\nValid Until: ${v.until}\nStatus: Active`
      }
    };
    envState.fileSystem.order = ["cert_info.txt"];

    return { envState, targets: { targetNoteName: "cert_expiry.txt", targetText: v.until } };
  },
  goalPredicates: ["note.saved"],
  progressPredicates: ["terminal.command_ran", "note.target_appended"],
  forbiddenPredicates: []
};