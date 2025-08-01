export const uiStyles: string = `
    #nlMediaInfo {
        display: block;
        padding: 20px;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      }
      
      .media-info-results {
        max-width: 1200px;
        margin: 0 auto;
      }
      
      .category {
        margin-bottom: 30px;
        border: 1px solid #ddd;
        border-radius: 5px;
        padding: 15px;
      }
      
      .category h4 {
        margin-top: 0;
        color: #333;
        border-bottom: 2px solid #007bff;
        padding-bottom: 5px;
      }
      
      .format, .codec, .bitrate {
        background: #f8f9fa;
        padding: 10px;
        margin: 10px 0;
        border-radius: 4px;
      }
      
      .format h5, .codec h5, .bitrate h5 {
        margin: 0 0 10px 0;
        color: #495057;
      }
      
      .format p, .codec p, .bitrate p {
        margin: 5px 0;
        color: #666;
      }
      
      #loading {
        text-align: center;
        padding: 20px;
        color: #666;
      }
      
      #error {
        color: crimson;
        padding: 10px;
        margin: 10px 0;
        border: 1px solid crimson;
        border-radius: 4px;
        background-color: #fff5f5;
      }
      
      .media-summary {
        background: #f8f9fa;
        padding: 20px;
        border-radius: 8px;
        margin-bottom: 30px;
      }
      
      .summary-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
        gap: 20px;
        margin-top: 20px;
      }
      
      .summary-item {
        background: white;
        padding: 20px;
        border-radius: 8px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        min-height: 120px;
      }
      
      .summary-item h3 {
        margin: 0 0 15px 0;
        color: #333;
        font-size: 1.1em;
        border-bottom: 2px solid #007bff;
        padding-bottom: 5px;
      }
      
      .summary-item p {
        margin: 8px 0;
        color: #666;
        line-height: 1.4;
      }
      
      .detailed-info {
        margin-top: 30px;
      }
      
      .video-details, .audio-details {
        background: #fff;
        padding: 20px;
        border-radius: 8px;
        margin-bottom: 20px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.05);
      }
      
      .info-row {
        display: grid;
        grid-template-columns: 200px 1fr;
        padding: 8px 0;
        border-bottom: 1px solid #eee;
      }
      
      .info-row .label {
        font-weight: bold;
        color: #555;
      }
      
      .info-row .value {
        color: #666;
      }
      
      /* ダークモード対応 */
      @media (prefers-color-scheme: dark) {
        body {
          background-color: #1a1a1a;
          color: #fff;
        }
      
        .category {
          border-color: #333;
        }
      
        .format, .codec, .bitrate {
          background: inherit;
        }
      
        .format h5, .codec h5, .bitrate h5 {
          color: #e1e1e1;
        }
      
        .format p, .codec p, .bitrate p {
          color: #bbb;
        }
      
        .media-summary {
          background: #2d2d2d;
        }
        
        .summary-item {
          background: #333;
        }
        
        .summary-item h3 {
          color: #e1e1e1;
        }
        
        .summary-item p {
          color: #bbb;
        }
        
        .video-details, .audio-details {
          background: #2d2d2d;
        }
        
        .info-row {
          border-bottom-color: #444;
        }
        
        .info-row .label {
          color: #e1e1e1;
        }
        
        .info-row .value {
          color: #bbb;
        }
      }  
`; 