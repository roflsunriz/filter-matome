/* eslint-env node */
// Viteコンフィグ作成ヘルパースクリプト
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { fileURLToPath } from "node:url";

// ESモジュールで__dirnameを取得
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

/**
 * 対話式でコンフィグファイルを作成する
 */
async function createConfig() {
  console.log("Viteコンフィグ作成ヘルパー");
  console.log("========================");

  const templateFile = "vite.ts-css.template.js";
  
  // コンフィグ名の入力
  const configName = await question("コンフィグ名を入力してください (例: header, watch_page): ");
  const outputPath = path.resolve(__dirname, `./vite.${configName}.config.js`);

  // 既存ファイルのチェック
  if (fs.existsSync(outputPath)) {
    const overwrite = await question(`${outputPath} は既に存在します。上書きしますか？ (y/n): `);
    if (overwrite.toLowerCase() !== "y") {
      console.log("操作をキャンセルしました。");
      rl.close();
      return;
    }
  }

  // 除外パターンの設定
  const excludePatterns = await question(
    "除外パターンをカンマ区切りで入力してください (例: src/comments_filter/explanation/**,src/watch_page/deleted_videos/**): "
  );
  const excludeArray = excludePatterns
    ? excludePatterns.split(",").map((pattern) => pattern.trim())
    : [];

  try {

      // TS+CSSテンプレートの場合
      const entry = await question("エントリーポイントを入力してください (例: src/header/index.ts): ");
      const name =
        (await question("出力バンドル名を入力してください (デフォルト: " + configName + "): ")) ||
        configName;
      const formats = (await question("ビルド形式を入力してください (デフォルト: es): ")) || "es";

      const configContent = `// 自動生成されたViteコンフィグ
import { defineConfig } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';

// ESモジュールで__dirnameを取得
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// テンプレート関数をインポート
import createConfigTemplate from './${templateFile}';

// 設定の作成
export default createConfigTemplate({
  entry: '${entry}',
  name: '${name}',
  formats: ['${formats.split(",").join("', '")}'],
  exclude: [${excludeArray.length > 0 ? "\n    '" + excludeArray.join("',\n    '") + "',\n  " : ""}],
});`;

      fs.writeFileSync(outputPath, configContent);

    console.log(`コンフィグファイルを生成しました: ${outputPath}`);

    // package.jsonにビルドスクリプトを追加
    const addBuildScript = await question("package.jsonにビルドスクリプトを追加しますか？ (y/n): ");
    if (addBuildScript.toLowerCase() === "y") {
      try {
        const packageJsonPath = path.resolve(__dirname, "../package.json");
        if (fs.existsSync(packageJsonPath)) {
          const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));

          // scriptsセクションがなければ作成
          if (!packageJson.scripts) {
            packageJson.scripts = {};
          }

          const scriptName = `build:${configName}`;
          const scriptCommand = `vite build --config config/vite.${configName}.config.js`;

          // スクリプトが既に存在するか確認
          if (packageJson.scripts[scriptName]) {
            const overwriteScript = await question(
              `スクリプト "${scriptName}" は既に存在します。上書きしますか？ (y/n): `
            );
            if (overwriteScript.toLowerCase() !== "y") {
              console.log("スクリプト追加をスキップしました。");
              rl.close();
              return;
            }
          }

          // スクリプトを追加または更新
          packageJson.scripts[scriptName] = scriptCommand;

          // 整形してファイルに書き戻す
          fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + "\n");
          console.log(`package.jsonに "${scriptName}" スクリプトを追加しました。`);
          console.log(`ビルドコマンド: npm run ${scriptName}`);
        } else {
          console.warn("package.jsonが見つかりませんでした。スクリプト追加をスキップします。");
        }
      } catch (err) {
        console.error("package.jsonの編集中にエラーが発生しました:", err);
      }
    }
  } catch (err) {
    console.error("ファイル操作中にエラーが発生しました:", err);
  } finally {
    rl.close();
  }
}

/**
 * 質問を表示して応答を待つ
 * @param {string} query - 質問文
 * @returns {Promise<string>} - ユーザーの回答
 */
function question(query) {
  return new Promise((resolve) => {
    rl.question(query, (answer) => {
      resolve(answer);
    });
  });
}

// スクリプト実行
createConfig().catch((err) => {
  console.error("エラーが発生しました:", err);
  rl.close();
});
