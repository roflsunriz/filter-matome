import { COMMENT_RENDERER_CONFIG } from '../config/constants.js';
import { Comment } from '../../types/comment-types.js';
import { ExtendedDocument } from '../../types/ui-types.js';

/**
 * コメントレンダラークラス
 */
export class CommentRenderer {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private comments: Comment[] = [];
  private videoElement: HTMLVideoElement | null = null;
  private isPlaying = true;
  private isVisible = true;
  private opacity = COMMENT_RENDERER_CONFIG.OPACITY;
  private lastTime = 0;
  private commentDuration = COMMENT_RENDERER_CONFIG.COMMENT_DURATION_MS;
  private fontSize = COMMENT_RENDERER_CONFIG.DEFAULT_FONT_SIZE;
  private defaultColor = COMMENT_RENDERER_CONFIG.DEFAULT_COLOR;
  private maxCommentLength = COMMENT_RENDERER_CONFIG.MAX_COMMENT_LENGTH;
  private pausedComments = new Set<Comment>(); // 一時停止時のコメントを保持
  private strokeWidth = COMMENT_RENDERER_CONFIG.STROKE_WIDTH; // 縁取りの太さ
  private strokeColor = COMMENT_RENDERER_CONFIG.STROKE_COLOR; // 縁取りの色
  private laneHeight = 0; // レーンの高さ
  private maxLanes = 0; // 最大レーン数
  private vposThreshold = COMMENT_RENDERER_CONFIG.VPOS_THRESHOLD_MS; // 近傍とみなすミリ秒差
  private commentGroups: Comment[][] = []; // グループ化されたコメントを保持
  private pausedTime = 0; // 一時停止時の時間を保持
  private activeComments = new Set<Comment>(); // アクティブなコメントを保持
  private laneStates: (Comment | null)[] = []; // レーンの使用状態を管理
  private lastRenderTime = 0;
  private renderInterval = 1000 / COMMENT_RENDERER_CONFIG.RENDER_FPS; // レンダリング間隔
  private cleanupInterval = COMMENT_RENDERER_CONFIG.CLEANUP_INTERVAL_MS; // クリーンアップ間隔
  private lastCleanup = 0;
  private animationFrameId: number | null = null;
  private resizeObserver: ResizeObserver | null = null; // 動的リサイズ監視用
  
  // 仮想拡張キャンバス関連
  private virtualExtendedLeftWidth = 0; // 左側の仮想拡張領域の幅
  private virtualExtendedRightWidth = 0; // 右側の仮想拡張領域の幅
  private virtualCanvasWidth = 0; // 仮想キャンバスの全体幅
  private virtualExtendRatio = COMMENT_RENDERER_CONFIG.VIRTUAL_EXTEND_RATIO; // 仮想拡張領域の比率

  /**
   * コメントレンダラーを初期化
   */
  initialize(videoElement: HTMLVideoElement): void {
    window.logger.info("CommentRendererの初期化を開始するのじゃ！");
    this.videoElement = videoElement;
    this.setupCanvas();

    // 動画再生関連のイベントリスナーを設定
    this.setupVideoEventListeners();

    // 初期アニメーション開始
    this.startAnimation();
    window.logger.info("CommentRendererの初期化が完了したのじゃ！");
  }

  /**
   * 動画要素のイベントリスナーを設定
   */
  private setupVideoEventListeners(): void {
    if (!this.videoElement) return;

    this.videoElement.addEventListener("play", () => {
      window.logger.debug("動画再生開始のじゃ！");
      this.isPlaying = true;
      this.lastTime = this.videoElement!.currentTime * 1000;
    });

    this.videoElement.addEventListener("pause", () => {
      window.logger.debug("動画一時停止のじゃ！");
      this.isPlaying = false;
      this.pausedTime = this.videoElement!.currentTime * 1000;
    });

    this.videoElement.addEventListener("seeking", () => {
      window.logger.debug("シーク操作を検知したのじゃ！");
      this.handleSeek();
    });

    // バッファリング検知の追加
    this.videoElement.addEventListener('waiting', () => {
      window.logger.debug('バッファリング中なのじゃ...');
      this.isPlaying = false;
    });

    this.videoElement.addEventListener('playing', () => {
      window.logger.debug('再生再開したのじゃ！');
      this.isPlaying = true;
      this.lastTime = this.videoElement!.currentTime * 1000;
    });

    // エラー処理の追加
    this.videoElement.addEventListener('error', (e) => {
      window.logger.error('動画再生エラーが発生したのじゃ！', e);
    });
  }

  /**
   * キャンバスのセットアップ
   */
  private setupCanvas(): void {
    // 既存のcanvasがあれば削除
    const existingCanvas = document.getElementById("comment-canvas");
    if (existingCanvas) {
      existingCanvas.remove();
    }

    // 新しいcanvasを作成
    this.canvas = document.createElement("canvas");
    this.canvas.id = "comment-canvas";
    this.canvas.style.position = "absolute";
    this.canvas.style.top = "0";
    this.canvas.style.left = "0";
    this.canvas.style.width = "100%";
    this.canvas.style.height = "100%";
    this.canvas.style.pointerEvents = "none"; // クリックイベント透過の設定
    this.canvas.style.zIndex = "1";
    
    // 重要: pointerEventsがクロスブラウザで確実に適用されるよう追加対策
    this.canvas.setAttribute('style', this.canvas.getAttribute('style') + ' pointer-events: none !important;');
    
    // クリックイベントが確実に透過するよう念のためイベントハンドラも追加
    this.canvas.addEventListener('click', (e) => {
      // キャンバス上のクリックは透過させる（下の要素にイベントを伝播）
      e.stopPropagation();
      return true; // イベントを通過させる
    }, false);

    // video-containerの直下にcanvasを挿入
    const videoContainer = document.querySelector(".video-container");
    if (!videoContainer) {
      throw new Error("video-containerが見つからないのじゃ！");
    }

    // videoの直後にcanvasを挿入
    const video = document.getElementById("video-element");
    if (!video) {
      throw new Error("video要素が見つからないのじゃ！");
    }
    video.insertAdjacentElement("afterend", this.canvas);

    this.ctx = this.canvas.getContext("2d");
    this.resizeCanvas();
    window.addEventListener("resize", () => this.resizeCanvas());

    // ResizeObserverでvideo要素サイズ変化を監視
    if (typeof ResizeObserver !== "undefined" && this.videoElement) {
      this.resizeObserver = new ResizeObserver(() => {
        this.resizeCanvas();
      });
      this.resizeObserver.observe(this.videoElement);
    }

    // フルスクリーン状態変化でもリサイズ
    document.addEventListener("fullscreenchange", () => this.resizeCanvas());
  }

  /**
   * キャンバスのリサイズ
   */
  resizeCanvas(): void {
    if (!this.canvas || !this.videoElement) return;

    try {
      let rect = this.videoElement.getBoundingClientRect();

      // 全画面状態を確認
      const doc = document as ExtendedDocument;
      const isFullscreen = doc.fullscreenElement || 
                          doc.webkitFullscreenElement || 
                          doc.mozFullScreenElement || 
                          doc.msFullscreenElement ||
                          document.documentElement.classList.contains('fullscreen-active') ||
                          document.body.classList.contains('nc-fullscreen-active');

      // 全画面時の特別処理
      if (isFullscreen) {
        // ビデオが position: fixed かどうかを確認
        const videoStyle = window.getComputedStyle(this.videoElement);
        if (videoStyle.position === 'fixed') {
          // ビデオが固定位置の場合、ビデオの実際の位置・サイズを使用
          rect = this.videoElement.getBoundingClientRect();
          
          // キャンバスもビデオと同じ固定位置に配置
          this.canvas.style.position = 'fixed';
          this.canvas.style.top = `${rect.top}px`;
          this.canvas.style.left = `${rect.left}px`;
          this.canvas.style.width = `${rect.width}px`;
          this.canvas.style.height = `${rect.height}px`;
          this.canvas.style.zIndex = '1001';
          
          window.logger.info("ビデオ固定位置でキャンバスを配置:", { rect, videoPosition: videoStyle.position });
        } else {
          // 通常の全画面処理
          rect = {
            width: window.innerWidth,
            height: window.innerHeight,
            top: 0,
            left: 0,
            right: window.innerWidth,
            bottom: window.innerHeight,
            x: 0,
            y: 0
          } as DOMRect;
          
          this.canvas.style.position = 'absolute';
          this.canvas.style.top = '0';
          this.canvas.style.left = '0';
          this.canvas.style.width = '100%';
          this.canvas.style.height = '100%';
          this.canvas.style.zIndex = '1';
          
          window.logger.info("通常全画面モードでキャンバスサイズを調整するのじゃ:", rect);
        }
      } else {
        // 非全画面時：デフォルトのスタイルに戻す
        this.canvas.style.position = 'absolute';
        this.canvas.style.top = '0';
        this.canvas.style.left = '0';
        this.canvas.style.width = '100%';
        this.canvas.style.height = '100%';
        this.canvas.style.zIndex = '1';
      }

      // キャンバスサイズが有効な値かチェック
      if (rect.width <= 0 || rect.height <= 0) {
        window.logger.warn("無効なキャンバスサイズなのじゃ:", rect);
        
        // 親要素のサイズから推測する
        const videoContainer = document.querySelector(".video-container");
        if (videoContainer) {
          const containerRect = videoContainer.getBoundingClientRect();
          if (containerRect.width > 0 && containerRect.height > 0) {
            this.canvas.width = containerRect.width;
            this.canvas.height = containerRect.height;
            window.logger.info("コンテナサイズを使用してキャンバスを調整したのじゃ:", containerRect);
          } else {
            return;
          }
        } else {
          return;
        }
      } else {
        this.canvas.width = rect.width;
        this.canvas.height = rect.height;
      }
      
      // 仮想拡張キャンバスのサイズを計算
      this.virtualExtendedLeftWidth = Math.ceil(this.canvas.width * this.virtualExtendRatio);
      this.virtualExtendedRightWidth = Math.ceil(this.canvas.width * this.virtualExtendRatio);
      this.virtualCanvasWidth = this.virtualExtendedLeftWidth + this.canvas.width + this.virtualExtendedRightWidth;
      
      window.logger.info("仮想拡張キャンバスを設定したのじゃ！", {
        visible: this.canvas.width,
        virtualLeft: this.virtualExtendedLeftWidth,
        virtualRight: this.virtualExtendedRightWidth,
        total: this.virtualCanvasWidth,
        isFullscreen: !!isFullscreen
      });
      
      // 明示的にビデオ要素のスタイルを設定（黒帯防止）
      this.videoElement.style.width = "100%";
      this.videoElement.style.height = "auto";
      
      this.calculateFontSize();

      // レーン関連の計算を更新
      this.laneHeight = this.fontSize * 1.2; // 行間を少し空ける

      // 安全なレーン数を計算
      const calculatedLanes = Math.floor(this.canvas.height / this.laneHeight);
      this.maxLanes = Math.min(
        calculatedLanes,
        COMMENT_RENDERER_CONFIG.MAX_LANES_LIMIT
      );

      // 配列サイズが有効かチェック
      if (this.maxLanes <= 0) {
        window.logger.warn("無効なレーン数なのじゃ:", this.maxLanes);
        this.maxLanes = 10; // デフォルト値を設定
      }

      // レーン状態配列を初期化
      this.laneStates = new Array(this.maxLanes).fill(null);

      window.logger.info("キャンバスとレーンの初期化完了なのじゃ！", {
        width: this.canvas.width,
        height: this.canvas.height,
        fontSize: this.fontSize,
        laneHeight: this.laneHeight,
        maxLanes: this.maxLanes,
        isFullscreen: !!isFullscreen,
      });

      // フォント・レーン更新後にコメントの幅・速度を再計算
      this.recalcCommentMetrics();
    } catch (error) {
      window.logger.error("キャンバスのリサイズに失敗したのじゃ:", error);
      // エラー時は最小構成で初期化
      this.maxLanes = 10;
      this.laneStates = new Array(this.maxLanes).fill(null);
    }
  }

  /**
   * アニメーションを開始
   */
  private startAnimation(): void {
    const animate = (timestamp: number) => {
      this.animate(timestamp);
      this.animationFrameId = requestAnimationFrame(animate);
    };
    
    this.animationFrameId = requestAnimationFrame(animate);
  }

  /**
   * アニメーションフレームごとの処理
   */
  private animate(timestamp: number): void {
    if (!this.ctx || !this.videoElement) return;

    // フレームレート制御
    if (timestamp - this.lastRenderTime < this.renderInterval) {
      return;
    }

    const currentTime = this.videoElement.currentTime * 1000;
    
    // 定期的なクリーンアップ
    if (timestamp - this.lastCleanup > this.cleanupInterval) {
      this.cleanup(currentTime);
      this.lastCleanup = timestamp;
    }

    this.renderComments(currentTime);
    this.lastRenderTime = timestamp;
  }

  /**
   * 古いコメントのクリーンアップ
   */
  private cleanup(currentTime: number, force = false): void {
    // コメントの削除条件を位置ベースに変更
    // 仮想拡張キャンバスの左端を完全に通過したら削除するのじゃ
    this.activeComments.forEach(comment => {
      if (force) {
        this.activeComments.delete(comment);
        return;
      }

      // 必要なデータが揃っているか確認
      if (
        comment.startTime === undefined ||
        comment.initialX === undefined ||
        comment.speed === undefined ||
        comment.width === undefined
      ) {
        return;
      }

      const elapsed = currentTime - comment.startTime;
      const virtualX = comment.initialX - elapsed * comment.speed;

      // 右端が仮想拡張キャンバスの左端を完全に通過したら削除
      if (virtualX + comment.width < -this.virtualExtendedLeftWidth) {
        this.activeComments.delete(comment);
      }
    });

    // 不要なグループの削除
    this.commentGroups = this.commentGroups.filter(group => 
      group.some(comment => this.activeComments.has(comment))
    );
  }

  /**
   * レンダリング
   */
  private renderComments(currentTime: number): void {
    if (!this.ctx || !this.canvas || !this.isVisible) return;

    this.ctx.font = `${this.fontSize}px Arial`;
    this.ctx.textBaseline = "top";
    this.ctx.globalAlpha = this.opacity;
    this.ctx.lineWidth = this.strokeWidth;
    this.ctx.strokeStyle = this.strokeColor;

    // キャンバスをクリア
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // 一時停止中は最後の時間を使用
    const renderTime = this.isPlaying ? currentTime : this.pausedTime;

    // 新規コメントのチェックと追加
    this.comments.forEach((comment) => {
      const isInRange =
        comment.vposMs <= renderTime && renderTime < comment.vposMs + this.commentDuration;

      if (isInRange && !this.activeComments.has(comment)) {
        // 新規コメントの初期化
        comment.startTime = renderTime - (renderTime - comment.vposMs);
        if (!comment.width && this.ctx) {
          comment.width = this.ctx.measureText(comment.body.substring(0, this.maxCommentLength)).width;
        }
        this.activeComments.add(comment);

        // グループを見つけるか新しいグループを作成
        this.assignToGroup(comment, renderTime);
      }
    });

    // キャンバス幅をローカル変数に保存して型エラーを回避
    const canvasWidth = this.canvas.width;

    // グループごとにコメントを描画
    this.commentGroups.forEach((group) => {
      const activeGroupComments = group.filter((comment) => this.activeComments.has(comment));

      if (activeGroupComments.length > 0) {
        activeGroupComments.forEach((comment) => {
          if (comment.startTime === undefined || comment.initialX === undefined || 
              comment.speed === undefined || comment.fixedY === undefined) return;

          const elapsed = currentTime - comment.startTime;
          
          // 仮想拡張キャンバス上でのX座標を計算
          const virtualX = comment.initialX - elapsed * comment.speed;
          
          // 実際の描画領域上でのX座標に変換（左側の仮想領域を考慮）
          const actualX = virtualX - this.virtualExtendedLeftWidth;
          
          // コメントの終端X座標
          const commentEndX = actualX + (comment.width || 0);

          // 実際の表示領域内にあるかチェック
          const isVisible = (actualX < canvasWidth && commentEndX > 0) || !!comment.forceVisible;
          
          // 完全に画面外（仮想拡張領域も含む）に出たかチェック
          // コメントの右端が仮想拡張キャンバスの左端を完全に通過した時に削除
          if (comment.width && virtualX + comment.width < -this.virtualExtendedLeftWidth) {
            this.activeComments.delete(comment);
            return;
          }
          
          // 表示領域内のみ描画
          if (isVisible) {
            this.drawCommentWithStroke(
              comment.body.substring(0, this.maxCommentLength),
              actualX,
              comment.fixedY,
              comment.color || this.defaultColor
            );
          }
        });
      }
    });
  }

  /**
   * コメントをグループに割り当て
   */
  private assignToGroup(comment: Comment, currentTime: number): void {
    // 既存のグループを探す
    let foundGroup = this.commentGroups.find((group) =>
      group.some((c) => Math.abs(c.vposMs - comment.vposMs) <= this.vposThreshold)
    );

    if (!foundGroup) {
      // 新しいグループを作成
      foundGroup = [comment];
      this.commentGroups.push(foundGroup);
    } else {
      // 既存のグループに追加
      // 同じコメントが重複して追加されないようガード
      if (!foundGroup.includes(comment)) {
        foundGroup.push(comment);
      }
    }

    // グループ内でコメントを時間順にソート
    foundGroup.sort((a, b) => a.vposMs - b.vposMs);

    // グループ内の位置に基づいて最適なレーンを探す
    const groupIndex = foundGroup.indexOf(comment);
    let lane = null;

    if (groupIndex === 0) {
      // グループの最初のコメントは空いているレーンを探す
      lane = this.findAvailableLane(currentTime, comment.width);
    } else {
      // グループ内の他のコメントの下に配置を試みる
      const prevComment = foundGroup[groupIndex - 1];
      const preferredLane = (prevComment.fixedLane !== undefined) ? prevComment.fixedLane + 1 : 0;
      lane = this.findAvailableLane(currentTime, comment.width, preferredLane);
    }

    // 位置を固定
    comment.fixedLane = lane;
    comment.fixedY = lane * this.laneHeight;
    
    // 仮想拡張キャンバスの右端から出現するように設定
    comment.initialX = this.virtualExtendedLeftWidth + (this.canvas?.width ?? 0) + this.virtualExtendedRightWidth;
    
    // コメントの速度計算
    // 可視キャンバス（実画面）+コメント幅 を commentDuration で移動する速さにするのじゃ
    // これにより拡張領域を含めた全距離ではなく、
    // 画面内を 6 秒で横切り、その後も拡張キャンバス分だけゆっくり残る
    const visibleDistance = (this.canvas?.width ?? 0) + (comment.width ?? 0);
    comment.speed = visibleDistance / this.commentDuration;
  }

  /**
   * シーク時の処理
   */
  private handleSeek(): void {
    const currentTime = this.videoElement?.currentTime ?? 0;
    this.activeComments.clear();
    this.commentGroups = [];
    this.lastTime = currentTime * 1000;
    this.pausedTime = currentTime * 1000;
  }

  /**
   * フォントサイズの計算
   */
  private calculateFontSize(): void {
    if (!this.canvas) return;
    const targetLines = 11; // 目標の行数
    const calculatedSize = Math.floor(this.canvas.height / targetLines);
    this.fontSize = Math.max(COMMENT_RENDERER_CONFIG.MIN_FONT_SIZE, calculatedSize);
  }

  /**
   * コメントの表示/非表示を切り替え
   */
  setVisible(visible: boolean): void {
    this.isVisible = visible;
    if (this.canvas) {
      this.canvas.style.display = visible ? "block" : "none";
    }
    if (!visible) {
      this.clearCanvas();
    }
  }

  /**
   * キャンバスをクリア
   */
  private clearCanvas(): void {
    if (this.ctx && this.canvas) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
  }

  /**
   * 縁取り付きテキスト描画
   */
  private drawCommentWithStroke(text: string, x: number, y: number, color: string): void {
    if (!this.ctx) return;
    
    // 縁取りを描画
    this.ctx.strokeStyle = this.strokeColor;
    this.ctx.lineWidth = this.strokeWidth;
    this.ctx.strokeText(text, x, y);

    // テキストを描画
    this.ctx.fillStyle = color;
    this.ctx.fillText(text, x, y);
  }

  /**
   * コメントを追加
   */
  addComment(comment: Comment): void {
    // コメントの幅を事前計算
    if (this.ctx) {
      this.ctx.font = `${this.fontSize}px Arial`;
      const width = this.ctx.measureText(comment.body.substring(0, this.maxCommentLength)).width;
      comment.width = width;
    }

    this.comments.push(comment);

    // コメントを時間順にソート
    this.comments.sort((a, b) => a.vposMs - b.vposMs);
    
    // グループの再計算
    this.calculateCommentGroups();
  }

  /**
   * コメントのグループ化
   */
  private calculateCommentGroups(): void {
    // コメントをグループ化（近い時間のものをまとめる）
    this.commentGroups = [];
    let currentGroup: Comment[] = [];

    this.comments.forEach((comment) => {
      if (currentGroup.length === 0) {
        currentGroup.push(comment);
      } else {
        const lastComment = currentGroup[currentGroup.length - 1];
        if (Math.abs(comment.vposMs - lastComment.vposMs) <= this.vposThreshold) {
          currentGroup.push(comment);
        } else {
          // グループ番号を割り当て
          currentGroup.forEach((c, index) => {
            c.group = this.commentGroups.length;
            c.groupIndex = index;
          });
          this.commentGroups.push([...currentGroup]);
          currentGroup = [comment];
        }
      }
    });

    if (currentGroup.length > 0) {
      // 最後のグループの処理
      currentGroup.forEach((c, index) => {
        c.group = this.commentGroups.length;
        c.groupIndex = index;
      });
      this.commentGroups.push(currentGroup);
    }
  }

  /**
   * レーンが利用可能かチェック
   */
  private isLaneAvailable(lane: number, currentTime: number, commentWidth: number | undefined): boolean {
    if (lane >= this.maxLanes) return false;
    if (!this.canvas) return false;

    // CanvasがNon-nullであることを明示的に宣言
    const canvas = this.canvas;
    const canvasWidth = canvas.width;

    // 新しいコメントの幅が定義されていない場合は使用できないとみなす
    if (commentWidth === undefined) {
      return false;
    }

    // レーンが空いているか、既存のコメントと重ならないか確認
    for (const existingComment of this.activeComments) {
      if (existingComment.fixedLane === lane && existingComment.initialX !== undefined && 
          existingComment.startTime !== undefined && existingComment.speed !== undefined) {
        // 既存コメントの幅を確認
        const existingWidth = existingComment.width || 0;
        
        // 仮想キャンバス上での位置を計算
        const virtualX = existingComment.initialX - (currentTime - existingComment.startTime) * existingComment.speed;
          
        // 実際の表示領域上でのX座標に変換
        const actualX = virtualX - this.virtualExtendedLeftWidth;
        const existingEndX = actualX + existingWidth;
        
        // 重なり判定: 長いコメントほど厳しく判定する
        // 既存コメントが長い場合、新しいコメントとの距離をより大きく確保
        // 新しいコメントが長い場合も同様
        const overlapThreshold = Math.max(commentWidth, existingWidth) / 3;

        // 新しいコメントの開始位置は仮想拡張キャンバスの右端
        // 右側の仮想領域に新しいコメントが入る前に衝突判定を行う
        if (existingEndX > canvasWidth - overlapThreshold) {
          // 既存コメントの終端が画面右端よりも右側にあり、コメント幅に基づいた距離内なら衝突と判定
          return false;
        }
        
        // コメントの長さを考慮した追加チェック
        // 短いコメントの上に長いコメントが重ならないようにする
        if (commentWidth > existingWidth * 1.5 && existingEndX > canvasWidth - commentWidth) {
          // 新しいコメントが既存コメントよりかなり長い場合、より厳しく判定
          return false;
        }
      }
    }
    return true;
  }

  /**
   * 利用可能なレーンを探す
   */
  private findAvailableLane(currentTime: number, commentWidth: number | undefined, preferredLane: number | null = null): number {
    // コメントを長さでソートするため、最適なレーンを選択するための準備
    // 長いコメントは下のレーンに、短いコメントは上のレーンに配置する傾向がある
    
    // 優先レーンが指定されていて使用可能な場合はそれを使用
    if (preferredLane !== null && preferredLane < this.maxLanes && this.isLaneAvailable(preferredLane, currentTime, commentWidth)) {
      return preferredLane;
    }

    // コメントの長さに基づいた配置戦略
    // 長いコメントほど下のレーンから配置を試みる
    if (commentWidth && this.canvas) {
      const canvasWidth = this.canvas.width;
      const lengthRatio = commentWidth / canvasWidth;
      
      // 長いコメントほど下のレーンから探索
      if (lengthRatio > 0.5) {
        // 長いコメント: 下半分のレーンから探索
        const startLane = Math.floor(this.maxLanes / 2);
        
        // 下から上に探索
        for (let lane = this.maxLanes - 1; lane >= startLane; lane--) {
          if (this.isLaneAvailable(lane, currentTime, commentWidth)) {
            return lane;
          }
        }
        
        // 上半分も探索
        for (let lane = startLane - 1; lane >= 0; lane--) {
          if (this.isLaneAvailable(lane, currentTime, commentWidth)) {
            return lane;
          }
        }
      } else {
        // 短いコメント: 上半分のレーンから探索
        const endLane = Math.floor(this.maxLanes / 2);
        
        // 上から下に探索
        for (let lane = 0; lane < endLane; lane++) {
          if (this.isLaneAvailable(lane, currentTime, commentWidth)) {
            return lane;
          }
        }
        
        // 下半分も探索
        for (let lane = endLane; lane < this.maxLanes; lane++) {
          if (this.isLaneAvailable(lane, currentTime, commentWidth)) {
            return lane;
          }
        }
      }
    }
    
    // 通常の探索（上から下）
    for (let lane = 0; lane < this.maxLanes; lane++) {
      if (this.isLaneAvailable(lane, currentTime, commentWidth)) {
        return lane;
      }
    }

    // 空きがない場合はランダムなレーンを返す
    return Math.floor(Math.random() * this.maxLanes);
  }

  /**
   * 複数のコメントを追加
   */
  addComments(comments: Comment[]): void {
    comments.forEach(comment => this.addComment(comment));
  }

  /**
   * コメントをクリア
   */
  clearComments(): void {
    this.comments = [];
    this.activeComments.clear();
    this.commentGroups = [];
    this.laneStates = new Array(this.maxLanes).fill(null);
    this.clearCanvas();
    window.logger.info("コメントをクリアしたのじゃ！");
  }

  /**
   * 透明度を設定する
   * @param opacity 透明度（0.0～1.0の範囲）
   */
  setOpacity(opacity: number): void {
    if (opacity < 0 || opacity > 1) {
      window.logger.warn(`透明度の範囲外の値が指定されたのじゃ: ${opacity}、範囲は0.0～1.0なのじゃ`);
      opacity = Math.max(0, Math.min(1, opacity));
    }
    this.opacity = opacity;
    window.logger.info(`コメントの透明度を ${opacity} に設定したのじゃ`);
  }

  /**
   * デフォルトの色を設定する
   * @param color 色コード（例: "#FFFFFF"）
   */
  setDefaultColor(color: string): void {
    // 色コードの簡易バリデーション
    if (!/^#([0-9A-F]{3}){1,2}$/i.test(color)) {
      window.logger.warn(`無効な色コードなのじゃ: ${color}、デフォルト色を使用するのじゃ`);
      return;
    }
    this.defaultColor = color;
    window.logger.info(`コメントのデフォルト色を ${color} に設定したのじゃ`);
  }

  /**
   * レンダラーの破棄
   */
  destroy(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }
    
    // イベントリスナーのクリーンアップ
    window.removeEventListener('resize', () => this.resizeCanvas());
    
    // キャンバスの削除
    if (this.canvas) {
      this.canvas.remove();
    }
    
    // ResizeObserverの解除
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
    
    this.comments = [];
    this.activeComments.clear();
    this.commentGroups = [];
  }

  /**
   * コメント幅・速度をリサイズ後に補正する関数
   * フルスクリーン切り替え時などにフォントサイズが変わっても
   * 位置連続性を保ったまま正確な幅・速度で削除判定を行うのじゃ
   */
  private recalcCommentMetrics(): void {
    if (!this.ctx || !this.canvas) return;

    const currentTime = this.videoElement?.currentTime ?? 0;
    const now = currentTime * 1000;
    this.ctx.font = `${this.fontSize}px Arial`;

    // ── 1. アクティブコメント ──
    this.activeComments.forEach(c => {
      if (
        c.startTime === undefined || c.initialX === undefined ||
        c.speed === undefined
      ) return;

      const elapsed = now - c.startTime;
      const virtualX = c.initialX - elapsed * c.speed;      // 現在位置を保持

      // 新しい幅と速度
      const newWidth = this.ctx!.measureText(
        c.body.substring(0, this.maxCommentLength)
      ).width;
      const visibleDist = this.canvas!.width + newWidth;
      const newSpeed = visibleDist / this.commentDuration;

      // 位置を保つよう initialX を再計算
      c.initialX = virtualX + elapsed * newSpeed;
      c.speed = newSpeed;
      c.width = newWidth;

      // レーン高変更に合わせて Y も補正
      if (c.fixedLane !== undefined) {
        c.fixedY = c.fixedLane * this.laneHeight;
      }
    });

    // ── 2. 未表示コメント（キュー）──
    this.comments.forEach(c => {
      if (c.startTime !== undefined) return; // すでに流れ始めたものは上で処理済み
      const newWidth = this.ctx!.measureText(
        c.body.substring(0, this.maxCommentLength)
      ).width;
      c.width = newWidth;
      const visibleDist = this.canvas!.width + newWidth;
      c.speed = visibleDist / this.commentDuration;
    });

    window.logger.info("コメントの幅・速度を再計算したのじゃ！", {
      activeComments: this.activeComments.size,
      queuedComments: this.comments.filter(c => c.startTime === undefined).length,
      fontSize: this.fontSize,
      canvasWidth: this.canvas.width
    });
  }
} 