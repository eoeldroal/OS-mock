import type { TaskSpec, Viewport } from "../../types.js";
import { buildCatTerminalTask, buildLsTerminalTask, buildPwdTerminalTask } from "../scenario-builders.js";
import { TEAM3_TERMINAL_DOMAIN, createTeam3File, createTeam3NoteTarget, defineTeam3Task } from "./shared.js";

function createTerminalWorkspaceCompanion(
  noteTarget: ReturnType<typeof createTeam3NoteTarget>,
  history: string[],
  currentDirectory = "/workspace"
) {
  return {
    noteWindow: {
      ...noteTarget,
      preopen: true,
      windowId: "notes-target",
      bounds: { x: 920, y: 84, width: 348, height: 412 },
      focused: false,
      minimized: false
    },
    explorerWindow: {
      windowId: "explorer-main",
      bounds: { x: 78, y: 112, width: 336, height: 462 },
      currentPlace: "workspace" as const,
      currentDirectory,
      selectedFileId: noteTarget.fileId,
      focused: false,
      minimized: false
    },
    history
  };
}

export const terminalListDirTask: TaskSpec = defineTeam3Task({
  id: "terminal_list_directory_contents",
  split: "starter",
  domain: TEAM3_TERMINAL_DOMAIN,
  instruction:
    "Open Terminal, run 'ls' to list the files in the current directory, and record the file names into a note called 'dir_contents.txt', then save it.",
  maxSteps: 15,
  setup: (seed: number, viewport: Viewport) => {
    const dirVariants = [
      { cwd: "/home/user/workspace", files: ["report.txt", "notes.md"] },
      { cwd: "/home/user/documents", files: ["memo.txt", "summary.txt"] },
      { cwd: "/home/user/project", files: ["index.ts", "README.md"] }
    ];
    const variant = dirVariants[seed % dirVariants.length];
    const scenarioFiles = variant.files.map((name, index) =>
      createTeam3File(`team3-t2-s${index}`, name, "", variant.cwd)
    );

    return buildLsTerminalTask(
      {
        instruction:
          "Open Terminal, run 'ls' to list the files in the current directory, and record the file names into a note called 'dir_contents.txt', then save it.",
        viewport,
        cwd: variant.cwd,
        noteTarget: createTeam3NoteTarget("team3-t2-dir-note", "dir_contents.txt"),
        scenarioFiles
      },
      variant.files.join("\n")
    );
  }
});

export const team3TerminalRecordWorkingDirectoryTask: TaskSpec = defineTeam3Task({
  id: "team3_terminal_record_working_directory",
  split: "starter",
  domain: TEAM3_TERMINAL_DOMAIN,
  instruction:
    "Open Terminal, execute the command to print the current working directory, and save the absolute path to 'cwd_log.txt'.",
  maxSteps: 12,
  setup: (seed: number, viewport: Viewport) => {
    const paths = [
      "/home/user/projects/os-mock/src",
      "/home/user/workspace/backend/api",
      "/var/www/html/public/assets"
    ];
    const cwd = paths[seed % paths.length];
    const noteTarget = createTeam3NoteTarget("team3-t3-cwd-note", "cwd_log.txt");

    return buildPwdTerminalTask({
      instruction:
        "Open Terminal, execute the command to print the current working directory, and save the absolute path to 'cwd_log.txt'.",
      viewport,
      cwd,
      noteTarget,
      ...createTerminalWorkspaceCompanion(noteTarget, ["ls", "echo $SHELL", "whoami"])
    });
  }
});

export const terminalCatAndSaveConfigTask: TaskSpec = defineTeam3Task({
  id: "terminal_cat_and_save_config",
  split: "representative",
  domain: TEAM3_TERMINAL_DOMAIN,
  instruction:
    "Open Terminal, use the 'cat' command to read 'server_config.json', and copy the port number into a note named 'port_backup.txt'. Save the note.",
  maxSteps: 15,
  setup: (seed: number, viewport: Viewport) => {
    const configs = [
      { port: "8080", host: "localhost" },
      { port: "3000", host: "127.0.0.1" },
      { port: "5000", host: "0.0.0.0" }
    ];
    const variant = configs[seed % configs.length];
    const cwd = "/home/user";
    const noteTarget = createTeam3NoteTarget("team3-t4-port-note", "port_backup.txt");
    const sourceFile = createTeam3File(
      "team3-t4-conf",
      "server_config.json",
      `{\n  "host": "${variant.host}",\n  "port": ${variant.port}\n}`,
      cwd
    );

    return buildCatTerminalTask(
      {
        instruction:
          "Open Terminal, use the 'cat' command to read 'server_config.json', and copy the port number into a note named 'port_backup.txt'. Save the note.",
        viewport,
        cwd,
        noteTarget,
        ...createTerminalWorkspaceCompanion(noteTarget, ["ls", "pwd", "echo ready"])
      },
      sourceFile,
      variant.port
    );
  }
});

export const terminalCatEnvPasswordTask: TaskSpec = defineTeam3Task({
  id: "terminal_cat_env_password",
  split: "representative",
  domain: TEAM3_TERMINAL_DOMAIN,
  instruction:
    "Open Terminal, use 'cat' to read the '.env' file, copy the DB_PASSWORD value, and save it to 'db_pass.txt'.",
  maxSteps: 15,
  setup: (seed: number, viewport: Viewport) => {
    const passwords = ["supersecret99", "p@ssw0rd2026", "db_secure_key!"];
    const ports = ["3000", "5432", "8080"];
    const password = passwords[seed % passwords.length];
    const port = ports[seed % ports.length];
    const cwd = "/var/www/project";
    const sourceFile = createTeam3File(
      "team3-t11-env",
      ".env",
      `DB_USER=admin\nDB_PASSWORD=${password}\nPORT=${port}`,
      cwd
    );

    return buildCatTerminalTask(
      {
        instruction:
          "Open Terminal, use 'cat' to read the '.env' file, copy the DB_PASSWORD value, and save it to 'db_pass.txt'.",
        viewport,
        cwd,
        noteTarget: createTeam3NoteTarget("team3-t11-dbpass-note", "db_pass.txt")
      },
      sourceFile,
      password
    );
  }
});

export const terminalCatLogErrorCodeTask: TaskSpec = defineTeam3Task({
  id: "terminal_cat_log_error_code",
  split: "representative",
  domain: TEAM3_TERMINAL_DOMAIN,
  instruction:
    "Open Terminal, 'cat' the 'error.log' file, find the specific error code, and save it to 'last_error.txt'.",
  maxSteps: 15,
  setup: (seed: number, viewport: Viewport) => {
    const codes = ["ERR_CONNECTION_REFUSED", "ERR_TIMEOUT", "ERR_NOT_FOUND"];
    const errorCode = codes[seed % codes.length];
    const cwd = "/var/log/nginx";
    const sourceFile = createTeam3File(
      "team3-t12-log",
      "error.log",
      `[INFO] Server started\n[ERROR] Code: ${errorCode}\n[INFO] Restarting`,
      cwd
    );

    return buildCatTerminalTask(
      {
        instruction:
          "Open Terminal, 'cat' the 'error.log' file, find the specific error code, and save it to 'last_error.txt'.",
        viewport,
        cwd,
        noteTarget: createTeam3NoteTarget("team3-t12-err-note", "last_error.txt")
      },
      sourceFile,
      errorCode
    );
  }
});

export const terminalListLogDirTask: TaskSpec = defineTeam3Task({
  id: "terminal_list_log_directory",
  split: "representative",
  domain: TEAM3_TERMINAL_DOMAIN,
  instruction:
    "Open Terminal, run 'ls' to see the files in the current directory, and save the output to 'log_files.txt'.",
  maxSteps: 15,
  setup: (seed: number, viewport: Viewport) => {
    const dirVariants = [
      { cwd: "/var/log", files: ["syslog", "auth.log"] },
      { cwd: "/var/log/nginx", files: ["access.log", "error.log"] },
      { cwd: "/var/log/app", files: ["app.log", "debug.log", "warn.log"] }
    ];
    const variant = dirVariants[seed % dirVariants.length];
    const scenarioFiles = variant.files.map((name, index) =>
      createTeam3File(`team3-t13-s${index}`, name, "", variant.cwd)
    );

    return buildLsTerminalTask(
      {
        instruction:
          "Open Terminal, run 'ls' to see the files in the current directory, and save the output to 'log_files.txt'.",
        viewport,
        cwd: variant.cwd,
        noteTarget: createTeam3NoteTarget("team3-t13-logdir-note", "log_files.txt"),
        scenarioFiles
      },
      variant.files.join("\n")
    );
  }
});

export const terminalCatCsvEmailTask: TaskSpec = defineTeam3Task({
  id: "terminal_cat_csv_email",
  split: "representative",
  domain: TEAM3_TERMINAL_DOMAIN,
  instruction:
    "Open Terminal, 'cat users.csv', extract the email address of the admin user, and save it to 'admin_email.txt'.",
  maxSteps: 15,
  setup: (seed: number, viewport: Viewport) => {
    const adminEmails = ["admin@osmock.local", "root@osmock.local", "sysadmin@osmock.local"];
    const email = adminEmails[seed % adminEmails.length];
    const cwd = "/home/user/data";
    const sourceFile = createTeam3File(
      "team3-t14-csv",
      "users.csv",
      `role,email,id\nadmin,${email},1\nguest,guest@osmock.local,2`,
      cwd
    );

    return buildCatTerminalTask(
      {
        instruction:
          "Open Terminal, 'cat users.csv', extract the email address of the admin user, and save it to 'admin_email.txt'.",
        viewport,
        cwd,
        noteTarget: createTeam3NoteTarget("team3-t14-email-note", "admin_email.txt")
      },
      sourceFile,
      email
    );
  }
});

export const terminalRecordDeepPwdTask: TaskSpec = defineTeam3Task({
  id: "terminal_record_deep_pwd",
  split: "representative",
  domain: TEAM3_TERMINAL_DOMAIN,
  instruction:
    "Open Terminal, run 'pwd', and save the absolute path into a note named 'current_path.txt'.",
  maxSteps: 12,
  setup: (seed: number, viewport: Viewport) => {
    const paths = [
      { path: "/home/user/deep/nested/folder/src/app", history: ["cd /home/user", "ls -la", "cd deep/nested/folder/src/app", "npm run build"] },
      { path: "/var/www/html/backend/src/controllers", history: ["cd /var/www", "ls", "cd html/backend/src/controllers", "cat index.ts"] },
      { path: "/opt/services/os-mock/dist/lib", history: ["cd /opt", "ls -la", "cd services/os-mock/dist/lib", "node server.js"] }
    ];
    const variant = paths[seed % paths.length];
    const noteTarget = createTeam3NoteTarget("team3-t15-deep-note", "current_path.txt");

    return buildPwdTerminalTask({
      instruction:
        "Open Terminal, run 'pwd', and save the absolute path into a note named 'current_path.txt'.",
      viewport,
      cwd: variant.path,
      noteTarget,
      ...createTerminalWorkspaceCompanion(noteTarget, variant.history, "/workspace")
    });
  }
});

export const terminalCatHiddenCredentialsTask: TaskSpec = defineTeam3Task({
  id: "terminal_cat_hidden_credentials",
  split: "representative",
  domain: TEAM3_TERMINAL_DOMAIN,
  instruction:
    "Open Terminal, use 'cat' to read the hidden '.credentials' file, and copy the API key into 'secret_api_key.txt'. Save the note.",
  maxSteps: 15,
  setup: (seed: number, viewport: Viewport) => {
    const variants = [
      { key: "AIzaSyD4_test_fake_key_99", service: "GEMINI_API_KEY" },
      { key: "sk-proj-fakekey_openai_001", service: "OPENAI_API_KEY" },
      { key: "xoxb-fake-slack-token-xyz", service: "SLACK_BOT_TOKEN" }
    ];
    const variant = variants[seed % variants.length];
    const cwd = "/home/user/.config";
    const sourceFile = createTeam3File(
      "team3-t21-cred",
      ".credentials",
      `${variant.service}=${variant.key}\nAWS_KEY=AKIA123`,
      cwd
    );

    return buildCatTerminalTask(
      {
        instruction:
          "Open Terminal, use 'cat' to read the hidden '.credentials' file, and copy the API key into 'secret_api_key.txt'. Save the note.",
        viewport,
        cwd,
        noteTarget: createTeam3NoteTarget("team3-t21-key-note", "secret_api_key.txt")
      },
      sourceFile,
      variant.key
    );
  }
});

export const terminalListHiddenFilesTask: TaskSpec = defineTeam3Task({
  id: "terminal_list_hidden_files",
  split: "representative",
  domain: TEAM3_TERMINAL_DOMAIN,
  instruction:
    "Open Terminal, run 'ls' to list all files in the current directory (including hidden ones), and save the output to 'hidden_files.txt'.",
  maxSteps: 15,
  setup: (seed: number, viewport: Viewport) => {
    const variants = [
      [".env", ".gitignore", "main.ts"],
      [".credentials", ".npmrc", "index.ts"],
      [".env.local", ".dockerignore", "app.ts"]
    ];
    const names = variants[seed % variants.length];
    const cwd = "/home/user/project";
    const scenarioFiles = names.map((name, index) => createTeam3File(`team3-t22-s${index}`, name, "", cwd));

    return buildLsTerminalTask(
      {
        instruction:
          "Open Terminal, run 'ls' to list all files in the current directory (including hidden ones), and save the output to 'hidden_files.txt'.",
        viewport,
        cwd,
        noteTarget: createTeam3NoteTarget("team3-t22-hidden-note", "hidden_files.txt"),
        scenarioFiles
      },
      names.join("\n")
    );
  }
});

export const terminalCatJsonNestedTask: TaskSpec = defineTeam3Task({
  id: "terminal_cat_json_nested",
  split: "representative",
  domain: TEAM3_TERMINAL_DOMAIN,
  instruction:
    "Open Terminal, 'cat config.json', find the port number inside the 'database' object, and save it to 'db_port.txt'.",
  maxSteps: 15,
  setup: (seed: number, viewport: Viewport) => {
    const dbPorts = ["5432", "3306", "27017"];
    const serverPorts = ["80", "8080", "443"];
    const dbPort = dbPorts[seed % dbPorts.length];
    const serverPort = serverPorts[seed % serverPorts.length];
    const cwd = "/etc/app";
    const sourceFile = createTeam3File(
      "team3-t23-json",
      "config.json",
      `{\n  "server": {"port": ${serverPort}},\n  "database": {"host": "localhost", "port": ${dbPort}}\n}`,
      cwd
    );

    return buildCatTerminalTask(
      {
        instruction:
          "Open Terminal, 'cat config.json', find the port number inside the 'database' object, and save it to 'db_port.txt'.",
        viewport,
        cwd,
        noteTarget: createTeam3NoteTarget("team3-t23-dbport-note", "db_port.txt")
      },
      sourceFile,
      dbPort
    );
  }
});

export const terminalCatPythonImportTask: TaskSpec = defineTeam3Task({
  id: "terminal_cat_python_import",
  split: "representative",
  domain: TEAM3_TERMINAL_DOMAIN,
  instruction:
    "Open Terminal, read 'main.py' using 'cat', extract the name of the library being imported, and save it to 'imported_module.txt'.",
  maxSteps: 15,
  setup: (seed: number, viewport: Viewport) => {
    const variants = [
      { lib: "tensorflow", alias: "tf", desc: "Model initialized" },
      { lib: "numpy", alias: "np", desc: "Array created" },
      { lib: "pandas", alias: "pd", desc: "DataFrame loaded" }
    ];
    const variant = variants[seed % variants.length];
    const cwd = "/home/user/ai_project";
    const sourceFile = createTeam3File(
      "team3-t24-py",
      "main.py",
      `import ${variant.lib} as ${variant.alias}\n\nprint('${variant.desc}')\n`,
      cwd
    );

    return buildCatTerminalTask(
      {
        instruction:
          "Open Terminal, read 'main.py' using 'cat', extract the name of the library being imported, and save it to 'imported_module.txt'.",
        viewport,
        cwd,
        noteTarget: createTeam3NoteTarget("team3-t24-import-note", "imported_module.txt")
      },
      sourceFile,
      variant.lib
    );
  }
});

export const terminalFindSpecificExtensionTask: TaskSpec = defineTeam3Task({
  id: "terminal_find_specific_extension",
  split: "representative",
  domain: TEAM3_TERMINAL_DOMAIN,
  instruction:
    "Open Terminal, run 'ls', find the exact name of the PDF file among the listed items, and save its name to 'target_file.txt'.",
  maxSteps: 15,
  setup: (seed: number, viewport: Viewport) => {
    const variants = [
      { pdf: "report_final_v3.pdf", others: ["image.png", "archive.zip"] },
      { pdf: "contract_signed.pdf", others: ["logo.jpg", "data.csv"] },
      { pdf: "invoice_q2.pdf", others: ["notes.txt", "backup.tar.gz"] }
    ];
    const variant = variants[seed % variants.length];
    const cwd = "/home/user/downloads";
    const names = [...variant.others, variant.pdf];
    const scenarioFiles = names.map((name, index) => createTeam3File(`team3-t25-s${index}`, name, "", cwd));

    return buildLsTerminalTask(
      {
        instruction:
          "Open Terminal, run 'ls', find the exact name of the PDF file among the listed items, and save its name to 'target_file.txt'.",
        viewport,
        cwd,
        noteTarget: createTeam3NoteTarget("team3-t25-pdf-note", "target_file.txt"),
        scenarioFiles
      },
      variant.pdf
    );
  }
});

export const terminalCatCsvSpecificValueTask: TaskSpec = defineTeam3Task({
  id: "terminal_cat_csv_specific_value",
  split: "representative",
  domain: TEAM3_TERMINAL_DOMAIN,
  instruction:
    "Open Terminal, read 'employees.csv', find the employee ID for 'Alice', and save it to 'alice_id.txt'.",
  maxSteps: 15,
  setup: (seed: number, viewport: Viewport) => {
    const aliceIds = ["EMP-042", "EMP-117", "EMP-233"];
    const aliceId = aliceIds[seed % aliceIds.length];
    const cwd = "/home/user/hr";
    const sourceFile = createTeam3File(
      "team3-t31-csv",
      "employees.csv",
      `name,department,id\nBob,Sales,EMP-041\nAlice,Engineering,${aliceId}\nCharlie,HR,EMP-043`,
      cwd
    );

    return buildCatTerminalTask(
      {
        instruction:
          "Open Terminal, read 'employees.csv', find the employee ID for 'Alice', and save it to 'alice_id.txt'.",
        viewport,
        cwd,
        noteTarget: createTeam3NoteTarget("team3-t31-alice-note", "alice_id.txt")
      },
      sourceFile,
      aliceId
    );
  }
});

export const terminalCatGitignoreTask: TaskSpec = defineTeam3Task({
  id: "terminal_cat_gitignore",
  split: "representative",
  domain: TEAM3_TERMINAL_DOMAIN,
  instruction:
    "Open Terminal, 'cat .gitignore', extract the first directory listed (the one starting with 'node_'), and save it to 'ignored_dir.txt'.",
  maxSteps: 15,
  setup: (seed: number, viewport: Viewport) => {
    const variants = [
      { content: "node_modules/\n.env\ndist/\nbuild/", target: "node_modules/" },
      { content: "node_cache/\n.env.local\nout/\ncoverage/", target: "node_cache/" },
      { content: "node_packages/\n.DS_Store\nstatic/\n.tmp/", target: "node_packages/" }
    ];
    const variant = variants[seed % variants.length];
    const cwd = "/home/user/project";
    const sourceFile = createTeam3File("team3-t32-gitignore", ".gitignore", variant.content, cwd);

    return buildCatTerminalTask(
      {
        instruction:
          "Open Terminal, 'cat .gitignore', extract the first directory listed (the one starting with 'node_'), and save it to 'ignored_dir.txt'.",
        viewport,
        cwd,
        noteTarget: createTeam3NoteTarget("team3-t32-ignored-note", "ignored_dir.txt")
      },
      sourceFile,
      variant.target
    );
  }
});

export const terminalFindBackupFileTask: TaskSpec = defineTeam3Task({
  id: "terminal_find_backup_file",
  split: "representative",
  domain: TEAM3_TERMINAL_DOMAIN,
  instruction:
    "Open Terminal, run 'ls', find the file that starts with 'backup_', and save its full name to 'latest_backup.txt'.",
  maxSteps: 15,
  setup: (seed: number, viewport: Viewport) => {
    const variants = [
      { backup: "backup_2026_final.zip", others: ["data.txt", "old_logs.tar.gz"] },
      { backup: "backup_2025_q4.tar.gz", others: ["index.html", "config.json"] },
      { backup: "backup_db_20260101.sql", others: ["README.md", "schema.sql"] }
    ];
    const variant = variants[seed % variants.length];
    const cwd = "/var/backups";
    const names = [...variant.others, variant.backup];
    const scenarioFiles = names.map((name, index) => createTeam3File(`team3-t33-s${index}`, name, "", cwd));

    return buildLsTerminalTask(
      {
        instruction:
          "Open Terminal, run 'ls', find the file that starts with 'backup_', and save its full name to 'latest_backup.txt'.",
        viewport,
        cwd,
        noteTarget: createTeam3NoteTarget("team3-t33-backup-note", "latest_backup.txt"),
        scenarioFiles
      },
      variant.backup
    );
  }
});

export const terminalCatPackageJsonVersionTask: TaskSpec = defineTeam3Task({
  id: "terminal_cat_package_json_version",
  split: "representative",
  domain: TEAM3_TERMINAL_DOMAIN,
  instruction:
    "Open Terminal, 'cat package.json', find the installed version of 'react', and save the version string to 'react_version.txt'.",
  maxSteps: 15,
  setup: (seed: number, viewport: Viewport) => {
    const reactVersions = ["^18.2.0", "^17.0.2", "^18.3.1"];
    const axiosVersions = ["1.4.0", "1.6.0", "1.3.5"];
    const reactVersion = reactVersions[seed % reactVersions.length];
    const axiosVersion = axiosVersions[seed % axiosVersions.length];
    const cwd = "/home/user/frontend";
    const sourceFile = createTeam3File(
      "team3-t34-pkg",
      "package.json",
      `{\n  "name": "app",\n  "dependencies": {\n    "react": "${reactVersion}",\n    "axios": "${axiosVersion}"\n  }\n}`,
      cwd
    );

    return buildCatTerminalTask(
      {
        instruction:
          "Open Terminal, 'cat package.json', find the installed version of 'react', and save the version string to 'react_version.txt'.",
        viewport,
        cwd,
        noteTarget: createTeam3NoteTarget("team3-t34-react-note", "react_version.txt")
      },
      sourceFile,
      reactVersion
    );
  }
});

export const terminalFindShellScriptTask: TaskSpec = defineTeam3Task({
  id: "terminal_find_shell_script",
  split: "representative",
  domain: TEAM3_TERMINAL_DOMAIN,
  instruction:
    "Open Terminal, list the directory contents, identify the shell script file (.sh), and save its name to 'script_name.txt'.",
  maxSteps: 15,
  setup: (seed: number, viewport: Viewport) => {
    const variants = [
      { script: "run_server.sh", others: ["readme.md", "config.yaml"] },
      { script: "deploy.sh", others: ["Dockerfile", "nginx.conf"] },
      { script: "setup_env.sh", others: ["requirements.txt", "Makefile"] }
    ];
    const variant = variants[seed % variants.length];
    const cwd = "/home/user/scripts";
    const names = [...variant.others, variant.script];
    const scenarioFiles = names.map((name, index) => createTeam3File(`team3-t35-s${index}`, name, "", cwd));

    return buildLsTerminalTask(
      {
        instruction:
          "Open Terminal, list the directory contents, identify the shell script file (.sh), and save its name to 'script_name.txt'.",
        viewport,
        cwd,
        noteTarget: createTeam3NoteTarget("team3-t35-script-note", "script_name.txt"),
        scenarioFiles
      },
      variant.script
    );
  }
});

export const terminalCatProcessListTask: TaskSpec = defineTeam3Task({
  id: "terminal_cat_process_list",
  split: "representative",
  domain: TEAM3_TERMINAL_DOMAIN,
  instruction:
    "Open Terminal, 'cat processes.txt', find the PID for the 'nginx' service, and save it to 'nginx_pid.txt'.",
  maxSteps: 15,
  setup: (seed: number, viewport: Viewport) => {
    const pids = ["4021", "7731", "9105"];
    const pid = pids[seed % pids.length];
    const cwd = "/var/run";
    const sourceFile = createTeam3File(
      "team3-t36-proc",
      "processes.txt",
      `USER       PID %CPU %MEM    COMMAND\nroot         1  0.0  0.1    /sbin/init\nwww-data  ${pid}  0.0  0.5    nginx: worker process\nredis     5192  0.2  1.2    redis-server`,
      cwd
    );

    return buildCatTerminalTask(
      {
        instruction:
          "Open Terminal, 'cat processes.txt', find the PID for the 'nginx' service, and save it to 'nginx_pid.txt'.",
        viewport,
        cwd,
        noteTarget: createTeam3NoteTarget("team3-t36-pid-note", "nginx_pid.txt")
      },
      sourceFile,
      pid
    );
  }
});

export const terminalCatYamlConfigTask: TaskSpec = defineTeam3Task({
  id: "terminal_cat_yaml_config",
  split: "representative",
  domain: TEAM3_TERMINAL_DOMAIN,
  instruction:
    "Open Terminal, 'cat database.yml', extract the database username for the 'production' environment, and save it to 'prod_db_user.txt'.",
  maxSteps: 15,
  setup: (seed: number, viewport: Viewport) => {
    const users = [
      { dev: "dev_admin", prod: "prod_admin" },
      { dev: "local_user", prod: "prod_user" },
      { dev: "test_root", prod: "prod_root" }
    ];
    const variant = users[seed % users.length];
    const cwd = "/home/user/app/config";
    const sourceFile = createTeam3File(
      "team3-t38-yml",
      "database.yml",
      `development:\n  user: ${variant.dev}\n  pass: dev123\n\nproduction:\n  user: ${variant.prod}\n  pass: super_secure_pwd!`,
      cwd
    );

    return buildCatTerminalTask(
      {
        instruction:
          "Open Terminal, 'cat database.yml', extract the database username for the 'production' environment, and save it to 'prod_db_user.txt'.",
        viewport,
        cwd,
        noteTarget: createTeam3NoteTarget("team3-t38-dbuser-note", "prod_db_user.txt")
      },
      sourceFile,
      variant.prod
    );
  }
});

export const terminalCatCertExpiryTask: TaskSpec = defineTeam3Task({
  id: "terminal_cat_cert_expiry",
  split: "representative",
  domain: TEAM3_TERMINAL_DOMAIN,
  instruction:
    "Open Terminal, 'cat cert_info.txt', extract the exact 'Valid Until' date, and save it to 'cert_expiry.txt'.",
  maxSteps: 15,
  setup: (seed: number, viewport: Viewport) => {
    const variants = [
      { from: "2025-01-01", until: "2027-12-31" },
      { from: "2024-06-01", until: "2026-05-31" },
      { from: "2025-03-15", until: "2028-03-14" }
    ];
    const variant = variants[seed % variants.length];
    const cwd = "/etc/ssl/certs";
    const sourceFile = createTeam3File(
      "team3-t40-cert",
      "cert_info.txt",
      `Certificate Details:\nIssuer: Let's Encrypt Authority\nValid From: ${variant.from}\nValid Until: ${variant.until}\nStatus: Active`,
      cwd
    );

    return buildCatTerminalTask(
      {
        instruction:
          "Open Terminal, 'cat cert_info.txt', extract the exact 'Valid Until' date, and save it to 'cert_expiry.txt'.",
        viewport,
        cwd,
        noteTarget: createTeam3NoteTarget("team3-t40-expiry-note", "cert_expiry.txt")
      },
      sourceFile,
      variant.until
    );
  }
});

export const TEAM3_TERMINAL_TASKS: TaskSpec[] = [
  terminalListDirTask,
  team3TerminalRecordWorkingDirectoryTask,
  terminalCatAndSaveConfigTask,
  terminalCatEnvPasswordTask,
  terminalCatLogErrorCodeTask,
  terminalListLogDirTask,
  terminalCatCsvEmailTask,
  terminalRecordDeepPwdTask,
  terminalCatHiddenCredentialsTask,
  terminalListHiddenFilesTask,
  terminalCatJsonNestedTask,
  terminalCatPythonImportTask,
  terminalFindSpecificExtensionTask,
  terminalCatCsvSpecificValueTask,
  terminalCatGitignoreTask,
  terminalFindBackupFileTask,
  terminalCatPackageJsonVersionTask,
  terminalFindShellScriptTask,
  terminalCatProcessListTask,
  terminalCatYamlConfigTask,
  terminalCatCertExpiryTask
];
