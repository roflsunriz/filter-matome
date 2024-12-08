import { debugLog, debugError, debugWarn } from '../config.js';
import { parseTimeString } from '../utils/timeFormatter.js';
import { PlaybackController }from './PlaybackControl.js';

export class SyncPlayback {
    constructor(videoElement, isOfficialVideo) {
        this.videoElement = videoElement;
        this.isPlaying = !videoElement.paused;
        this.isOfficialVideo = isOfficialVideo;
        this.syncCheckIntervals = [];
        this.boundPlayHandler = this.handlePlayStateChange.bind(this);
        this.boundPauseHandler = this.handlePlayStateChange.bind(this);
        this.syncThreshold = 0.5;

        this.initializeEventListeners();
    }

    initializeEventListeners() {
        this.videoElement.addEventListener('play', this.boundPlayHandler);
        this.videoElement.addEventListener('pause', this.boundPauseHandler);
    }

    handlePlayStateChange() {
        const currentPlayingState = !this.videoElement.paused;
        if (currentPlayingState !== this.isPlaying) {
            this.isPlaying = currentPlayingState;
            if (this.isOfficialVideo() && PlaybackController.isOfficialPaidVideoStatic()) {
                this.syncWithOfficialPlayer({ 
                    playToggle: true, 
                    seeker: false, 
                    tracker: false 
                }).catch(error => 
                    debugError('再生状態同期エラー:', error));
            }
        }
    }

    createCustomEvent(eventType, options = {}) {
        return new MouseEvent(eventType, {
            view: window,
            bubbles: true,
            cancelable: true,
            ...options
        });
    }

    startSyncCheck() {
        const intervalId = window.setInterval(() => {
            this.checkAndSyncTimes();
        }, 30000);
        this.syncCheckIntervals.push(intervalId);
    }

    checkAndSyncTimes() {
        try {
            const timeElement = document.querySelector("div.jc_center:nth-child(2)");
            if (!timeElement) {
                debugWarn('公式プレーヤーの時間要素が見つかりません');
                return;
            }

            const timeText = timeElement.textContent;
            if (!timeText) {
                debugWarn('時間テキストが空です');
                return;
            }

            const currentTime_official = parseTimeString(timeText.split("/")[0]);
            const currentTime_pc = this.videoElement.currentTime;
            
            const timeDiff = Math.abs(currentTime_pc - currentTime_official);
            debugLog('時間差:', timeDiff);
            
            if (timeDiff > this.syncThreshold) {
                debugLog('時間のずれを検出:', { 
                    official: currentTime_official, 
                    pc: currentTime_pc,
                    difference: timeDiff 
                });
                this.syncWithAdjustment(currentTime_official, currentTime_pc);
            }
        } catch (error) {
            debugError('同期チェックエラー:', {
                error: error.message,
                stack: error.stack
            });
        }
    }

    async syncWithAdjustment(officialTime, pcTime) {
        const timeDiff = pcTime - officialTime;
        // 時間差が1秒未満の場合は試行回数を減らす
        const maxAttempts = Math.abs(timeDiff) < 1 
            ? 3  // 1秒未満なら3回まで
            : Math.min(Math.ceil(Math.abs(timeDiff) / 2) + 5, 20); // それ以外は時間差に応じて調整

        let currentThreshold = Math.min(Math.abs(timeDiff) * 0.05, 1.0); // 時間差の5%か1秒の小さい方
        let syncSuccess = false;
        let remainingDiff = timeDiff;

        for (let attempt = 0; attempt < maxAttempts && !syncSuccess; attempt++) {
            try {
                if (!await this.showOfficialPlayerControls()) continue;

                const officialTracker = document.querySelector("div.top_-x0_5:nth-child(3)");
                if (!officialTracker) continue;

                const rect = officialTracker.getBoundingClientRect();
                
                // 現在の時間差に基づいて調整を計算
                const adjustmentFactor = Math.abs(remainingDiff) < 0.5 ? 0.15 : 0.4;
                const targetAdjustment = remainingDiff * adjustmentFactor;
                const currentTime = this.videoElement.currentTime;
                const baseX = rect.left + (rect.width * (currentTime / this.videoElement.duration));
                const adjustedX = baseX + (rect.width * (targetAdjustment / this.videoElement.duration));

                // クリックイベントを発火
                officialTracker.dispatchEvent(this.createCustomEvent('click', {
                    clientX: adjustedX,
                    clientY: rect.top + (rect.height / 2)
                }));
                
                // 短い待機時間
                await new Promise(resolve => setTimeout(resolve, 150));
                
                // 新しい時間差を確認
                const newOfficialTime = parseTimeString(
                    document.querySelector("div.jc_center:nth-child(2)")?.textContent.split("/")[0]
                );
                const newDiff = this.videoElement.currentTime - newOfficialTime;
                remainingDiff = newDiff;

                // 閾値の動的調整
                currentThreshold = Math.max(currentThreshold * 0.8, 0.2);

                if (Math.abs(newDiff) < currentThreshold) {
                    syncSuccess = true;
                    break;
                }

                // 次の試行までの待機時間
                await new Promise(resolve => setTimeout(resolve, 200));

            } catch (error) {
                debugError(`同期試行 ${attempt + 1} 失敗:`, error);
                await new Promise(resolve => setTimeout(resolve, 400));
            }
        }

        return syncSuccess;
    }

    async showOfficialPlayerControls() {
        const player = document.querySelector('.cursor_inherit.ring_none [data-name=storyboard-content]')?.parentElement;
        if (!player) {
            debugError('公式プレイヤー要素が見つかりません');
            return false;
        }
        player.dispatchEvent(this.createCustomEvent('mouseover'));
        await new Promise(resolve => setTimeout(resolve, 100));
        return true;
    }

    async syncWithOfficialPlayer({ playToggle = false, seeker = false, tracker = true } = {}) {
        try {
            // コントローラーを表示
            if (!await this.showOfficialPlayerControls()) return false;

            if (playToggle) {
                // 再生/一時停止の同期
                const playButton = document.querySelector('#tooltip\\:\\:r6\\:\\:trigger');
                if (playButton) {
                    playButton.dispatchEvent(this.createCustomEvent('click'));
                }
            }

            if (seeker || tracker) {
                // トラッカーの同期
                const officialTracker = document.querySelector("div.top_-x0_5:nth-child(3)");
                if (!officialTracker) {
                    debugError('トラッカー要素が見つかりません');
                    return false;
                }

                const rect = officialTracker.getBoundingClientRect();
                const x = rect.left + (rect.width * (this.videoElement.currentTime / this.videoElement.duration));
                const y = rect.top + (rect.height / 2);

                officialTracker.dispatchEvent(this.createCustomEvent('click', {
                    clientX: x,
                    clientY: y
                }));
            }

            // 有料動画の場合は定期的な同期を開始
            if (PlaybackController.isOfficialPaidVideoStatic()) {
                this.startSyncCheck();
            }

            return true;
        } catch (error) {
            debugError('同期処理エラー:', error);
            return false;
        }
    }

    stopSync() {
        this.syncCheckIntervals.forEach(intervalId => {
            clearInterval(intervalId);
        });
        this.syncCheckIntervals = [];
    }

    cleanup() {
        this.stopSync();
        this.removeEventListeners();
    }

    removeEventListeners() {
        this.videoElement.removeEventListener('play', this.boundPlayHandler);
        this.videoElement.removeEventListener('pause', this.boundPauseHandler);
    }

    startAutoSync() {
        try {
            debugLog('自動同期を開始します');
            // 初回の同期を実行
            this.syncWithOfficialPlayer({
                playToggle: false,
                seeker: true,
                tracker: true
            });
            
            // 定期的な同期チェックを開始
            this.startSyncCheck();
        } catch (error) {
            debugError('自動同期開始エラー:', error);
        }
    }
}
  