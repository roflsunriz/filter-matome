import {materialIconsStyles} from '@/common/material-icons';

/**
 * Mylist2 ドキュメント用のCSSスタイル
 */

export const MYLIST2_DOCS_HEADER_ADJUSTMENT_STYLES = `
/**
 * Mylist2 Docs専用のヘッダー位置調整
 * CSS Custom Propertiesを上書きして環境に最適化
 */

:root {
  /* mylist2 docs環境での位置調整 */
  --header-offset-top: var(--header-mylist2-docs-top, -8px);
  --header-offset-left: var(--header-mylist2-docs-left, -8px);
}
`;

export const MYLIST2_DOCS_STYLES = `
        body {
            font-family: "Helvetica Neue", Arial, "Hiragino Kaku Gothic ProN", "Hiragino Sans", Meiryo, sans-serif;
            line-height: 1.6;
            color: #ffffff;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
            background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 50%, #3498db 100%);
        }
        
        .container {
            background: #2d2d2d;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.5);
            border: 1px solid rgba(77, 208, 225, 0.3);
            padding: 40px;
            margin-bottom: 20px;
        }
        
        h1 {
            color: #4dd0e1;
            border-bottom: 3px solid #3498db;
            padding-bottom: 10px;
            margin-bottom: 30px;
        }
        
        h2 {
            color: #3498db;
            border-bottom: 2px solid #4dd0e1;
            padding-bottom: 5px;
            margin-top: 40px;
            margin-bottom: 20px;
        }
        
        h3 {
            color: #4dd0e1;
            margin-top: 30px;
            margin-bottom: 15px;
        }
        
        .feature-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
            margin: 20px 0;
        }
        
        .feature-card {
            background: #424242;
            border: 1px solid rgba(77, 208, 225, 0.3);
            border-radius: 8px;
            padding: 20px;
            transition: transform 0.2s;
            color: #b0bec5;
        }
        
        .feature-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0, 188, 212, 0.3);
            border-color: #3498db;
        }
        
        .feature-title {
            color: #4dd0e1;
            font-weight: bold;
            font-size: 1.1em;
            margin-bottom: 10px;
        }
        
        .step {
            background: rgba(0, 188, 212, 0.15);
            border-left: 4px solid #3498db;
            padding: 15px;
            margin: 15px 0;
            border-radius: 0 4px 4px 0;
            color: #b0bec5;
        }
        
        .step-number {
            background: #3498db;
            color: white;
            width: 24px;
            height: 24px;
            border-radius: 50%;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            margin-right: 10px;
        }
        
        .warning {
            background: rgba(255, 193, 7, 0.15);
            border: 1px solid rgba(255, 193, 7, 0.4);
            border-radius: 4px;
            padding: 15px;
            margin: 15px 0;
            color: #ffecb3;
        }
        
        .info {
            background: rgba(0, 188, 212, 0.15);
            border: 1px solid rgba(0, 188, 212, 0.4);
            border-radius: 4px;
            padding: 15px;
            margin: 15px 0;
            color: #b0f7ff;
        }
        
        .code {
            background: #424242;
            border: 1px solid rgba(77, 208, 225, 0.3);
            border-radius: 4px;
            padding: 10px;
            font-family: "Consolas", "Monaco", "Courier New", monospace;
            overflow-x: auto;
            color: #4dd0e1;
        }
        
        .toc {
            background: #2d2d2d;
            border: 1px solid rgba(77, 208, 225, 0.3);
            border-radius: 8px;
            padding: 20px;
            margin: 30px 0;
        }
        
        .toc ul {
            list-style-type: none;
            padding-left: 0;
        }
        
        .toc li {
            margin: 8px 0;
        }
        
        .toc a {
            color: #4dd0e1;
            text-decoration: none;
            padding: 5px 10px;
            display: block;
            border-radius: 4px;
            transition: background-color 0.2s;
        }
        
        .toc a:hover {
            background-color: rgba(0, 188, 212, 0.2);
            color: #3498db;
        }
        
        .screenshot {
            max-width: 100%;
            height: auto;
            border: 1px solid rgba(77, 208, 225, 0.3);
            border-radius: 8px;
            margin: 20px 0;
            box-shadow: 0 2px 8px rgba(0, 188, 212, 0.2);
        }
        
        .button-demo {
            display: inline-block;
            background: #3498db;
            color: white;
            padding: 8px 16px;
            border-radius: 4px;
            text-decoration: none;
            margin: 5px;
            font-size: 0.9em;
            transition: background-color 0.2s;
        }

        .button-demo.warning {
            background: #c0392b;
        }
        
        .button-demo:hover {
            background: #0097a7;
        }
        
        .keyboard-key {
            background: #424242;
            border: 1px solid rgba(77, 208, 225, 0.3);
            border-radius: 3px;
            padding: 2px 6px;
            font-family: monospace;
            font-size: 0.9em;
            color: #4dd0e1;
        }
        
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
        }
        
        th, td {
            border: 1px solid rgba(77, 208, 225, 0.3);
            padding: 12px;
            text-align: left;
        }
        
        th {
            background-color: #2d2d2d;
            font-weight: bold;
            color: #4dd0e1;
        }
        
        td {
            color: #b0bec5;
        }
        
        tr:nth-child(even) {
            background-color: rgba(66, 66, 66, 0.3);
        }
        
        .footer {
            text-align: center;
            color: #b0bec5;
            font-size: 0.9em;
            padding: 20px;
            border-top: 1px solid rgba(77, 208, 225, 0.3);
            margin-top: 40px;
        }
      `;

export const MYLIST2_DOCS_STYLES_UNIFIED = materialIconsStyles + MYLIST2_DOCS_HEADER_ADJUSTMENT_STYLES + MYLIST2_DOCS_STYLES;
/**
 * スタイルをDOMに適用する関数
 */
export const applyMylist2DocsStyles = (): HTMLStyleElement => {
  const styleElement = document.createElement('style');
  styleElement.textContent = MYLIST2_DOCS_STYLES_UNIFIED;
  document.head.appendChild(styleElement);
  return styleElement;
}; 