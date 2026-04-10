import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) throw new Error("GEMINI_API_KEY 환경 변수가 설정되지 않았습니다.");
const genAI = new GoogleGenerativeAI(apiKey);

const osActionTool = {
  name: "take_os_action",
  description: "우분투 화면에서 마우스를 클릭하거나 키보드를 입력하여 주어진 목표를 달성합니다.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      type: { type: SchemaType.STRING, description: "행동 종류: MOVE_TO, CLICK, DOUBLE_CLICK, TYPING, PRESS, HOTKEY, DONE 등" },
      x: { type: SchemaType.NUMBER, description: "마우스 X 좌표" },
      y: { type: SchemaType.NUMBER, description: "마우스 Y 좌표" },
      text: { type: SchemaType.STRING, description: "타이핑할 텍스트 (TYPING 시 사용)" },
      key: { type: SchemaType.STRING, description: "누를 키 (PRESS 시 사용)" },
      keys: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING }, description: "단축키 조합 (HOTKEY 시 사용)" }
    },
    required: ["type"]
  }
};

const model = genAI.getGenerativeModel({
  model: "gemini-2.5-flash",
  tools: [{ functionDeclarations: [osActionTool] }],
  systemInstruction: `당신은 주어진 화면을 보고 지시사항을 수행하는 AI 에이전트입니다.
  버튼의 위치는 a11yTree 데이터를 참고하여 정확한 좌표(bounds 중앙값)를 계산해 클릭하세요.
  
  [중요 제약사항]
  - 파일을 생성하거나 내용을 기록하라는 지시가 있으면, 절대로 터미널의 리다이렉션(>, >>, nano 등)을 사용하지 마세요.
  - 반드시 화면에 있는 'Note Editor' (또는 Text Editor) GUI 앱을 마우스로 열어서 텍스트를 붙여넣고 저장 단축키(Ctrl+S)를 사용해야 점수를 받을 수 있습니다.`
});

const __dirname = dirname(fileURLToPath(import.meta.url));
const serverEntry = resolve(__dirname, "packages/mcp-server/dist/index.js");

// ⭐️ 전체 8개 테스트 케이스 목록
const ALL_TASKS = [

  // --- [확장 배치 3 (26~35)] ---
  "mail_extract_cancellation_fee",
  "mail_extract_hr_phone",
  "mail_extract_draft_recipient",
  "mail_extract_promo_code",
  "mail_extract_deadline",
  "terminal_cat_csv_specific_value",
  "terminal_cat_gitignore",
  "terminal_find_backup_file",
  "terminal_cat_package_json_version",
  "terminal_find_shell_script",

  // --- [초기 5개] ---
  "mail_extract_invoice_amount",
  "terminal_list_directory_contents",
  "terminal_record_working_directory",
  "terminal_cat_and_save_config",
  "mail_record_sender_address",

  // --- [확장 배치 1 (6~15)] ---
  "mail_extract_reset_link",
  "mail_extract_meeting_time",
  "mail_extract_tracking_info",
  "mail_extract_spam_sender",
  "mail_extract_2fa_code",
  "terminal_cat_env_password",
  "terminal_cat_log_error_code",
  "terminal_list_log_directory",
  "terminal_cat_csv_email",
  "terminal_record_deep_pwd",

  // --- [확장 배치 2 (16~25)] ---
  "mail_extract_trash_link",
  "mail_extract_messy_receipt_total",
  "mail_extract_flight_pnr",
  "mail_extract_exception_name",
  "mail_extract_ssh_ip",
  "terminal_cat_hidden_credentials",
  "terminal_list_hidden_files",
  "terminal_cat_json_nested",
  "terminal_cat_python_import",
  "terminal_find_specific_extension",

  // --- [최종 배치 (36~40)] ---
  "terminal_cat_process_list",
  "mail_extract_rebooked_flight",
  "terminal_cat_yaml_config",
  "mail_extract_unsubscribe_link",
  "terminal_cat_cert_expiry"
];

async function runTask(mcpClient: any, sessionId: string, taskId: string) {
  console.log(`\n==================================================`);
  console.log(`🚀 태스크 시작: [${taskId}]`);
  
  // 환경 리셋 및 지시사항 가져오기
  let response = await mcpClient.callTool({ name: "trainer.reset", arguments: { sessionId, taskId, seed: 0 } });
const responseText = response.content[0].text;

let instruction = "";
try {
  // 정상적인 JSON 응답일 경우 파싱 시도
  const parsed = JSON.parse(responseText);
  instruction = parsed.task.instruction;
  console.log(`🎯 지시사항: "${instruction}"\n`);
} catch (e) {
  // JSON 파싱에 실패하면 서버가 뱉은 에러 텍스트를 그대로 출력하고 이 태스크를 스킵
  console.error(`❌ 서버 엔진 에러 발생 (JSON 파싱 실패): \n${responseText}\n`);
  return { taskId, success: false, finalScore: 0 }; 
}

  let isTerminated = false;
  let finalScore = 0;
  let stepCount = 0;
  const chat = model.startChat();

  while (!isTerminated && stepCount < 15) { // 최대 15스텝 제한
    stepCount++;
    console.log(`--- [Step ${stepCount}] ---`);

    // 1. 관찰
    response = await mcpClient.callTool({ name: "computer13.observe", arguments: { sessionId } });
    const obsData = JSON.parse(response.content[0].text);
    
    const imageBytes = readFileSync(obsData.observation.screenshotPath);
    const imagePart = { inlineData: { data: imageBytes.toString("base64"), mimeType: "image/png" } };

    // 2. 추론
    const prompt = `목표: ${instruction}\nA11y Tree: ${JSON.stringify(obsData.observation.a11yTree)}\n다음 행동을 결정하세요.`;
    const aiResponse = await chat.sendMessage([prompt, imagePart]);
    const functionCall = aiResponse.response.functionCalls()?.[0];

    // 3. 행동 실행
    if (functionCall && functionCall.name === "take_os_action") {
      const action = functionCall.args;
      console.log(`🤖 행동: ${action.type}`, action);
      
      response = await mcpClient.callTool({ name: "computer13.step", arguments: { sessionId, action } });
      const stepResult = JSON.parse(response.content[0].text);
      
      isTerminated = stepResult.terminated;
      finalScore = stepResult.cumulativeReward;
      console.log(`📊 현재 점수: ${finalScore}`);
    } else {
      console.log("⚠️ 에이전트가 도구 호출에 실패했습니다. 종료합니다.");
      break;
    }
  }

  // 결과 판정
  const success = isTerminated && finalScore > 0;
  console.log(`\n🏁 [${taskId}] 결과: ${success ? "✅ 성공" : "❌ 실패"} (점수: ${finalScore})`);
  return { taskId, success, finalScore };
}

async function main() {
  const transport = new StdioClientTransport({ command: process.execPath, args: [serverEntry] });
  const mcpClient = new Client({ name: "gemini-batch-agent", version: "1.0.0" }, { capabilities: {} });
  await mcpClient.connect(transport);

  const results = [];
  try {
    // 세션 하나를 파서 8번의 태스크를 돌려씁니다.
    const sessionRes = await mcpClient.callTool({ name: "trainer.create_session", arguments: {} });
    const sessionId = JSON.parse(sessionRes.content[0].text).sessionId;

    // 8개 태스크 순차 실행
    for (const taskId of ALL_TASKS) {
      const result = await runTask(mcpClient, sessionId, taskId);
      results.push(result);
    }

    await mcpClient.callTool({ name: "trainer.close_session", arguments: { sessionId } });
  } finally {
    await mcpClient.close();
  }

  // 최종 리포트 출력
  console.log("\n==================================================");
  console.log("🏆 전체 테스트 결과 요약");
  console.log("==================================================");
  let totalSuccess = 0;
  results.forEach(r => {
    console.log(`- ${r.taskId}: ${r.success ? "✅" : "❌"} (점수: ${r.finalScore})`);
    if (r.success) totalSuccess++;
  });
  console.log(`\n총 ${ALL_TASKS.length}개 중 ${totalSuccess}개 성공!`);
}

main().catch(console.error);




