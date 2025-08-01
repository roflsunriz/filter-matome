/**
 * 背景画像関連の型定義
 */

// 背景画像設定の型定義
export interface BackgroundImageItem {
  id: string;
  name: string;
  type: 'url' | 'file';
  data: string; // URLまたはbase64データ
  createdAt: string;
  updatedAt: string;
}

export interface BackgroundImageConfig {
  images: BackgroundImageItem[];
  selectedImageId: string | null;
} 