export const commentsTemplate = `
<div class="comment-search-control">
  <input type="text" class="comment-search-input" placeholder="コメントを検索...">
  <div class="comment-search-options">
    <div class="option-group">
      <input type="checkbox" id="regex-toggle" class="regex-toggle">
      <label for="regex-toggle">正規表現</label>
    </div>
    <div class="option-group">
      <input type="checkbox" id="extended-toggle" class="extended-toggle">
      <label for="extended-toggle">詳細表示</label>
    </div>
  </div>
  <div class="comment-search-buttons">
    <button class="search-btn">検索</button>
    <button class="clear-btn">クリア</button>
  </div>
</div>

<div class="search-results">
  <!-- 検索結果がここに表示されます -->
  <div class="no-results">コメントを検索してください</div>
</div>
`;
