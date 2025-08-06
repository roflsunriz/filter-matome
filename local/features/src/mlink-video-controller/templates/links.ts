import { createMaterialIcon } from '../../common/material-icons';

export const linksTemplate = `
<div id="custom" class="subtab active">
  <div class="card-container">
    <!-- カスタムリンクがここに挿入されます -->
  </div>
</div>

<div id="services" class="subtab">
  <div class="card-container">
    <!-- 関連サービスのリンクがここに挿入されます -->
  </div>
</div>

<div id="dataManagement" class="subtab">
  <div class="card-container">
    <!-- データ管理のリンクがここに挿入されます -->
  </div>
</div>
<nav>
      <button data-subtab="custom" data-active>${createMaterialIcon('edit', { style: 'outlined', classes: 'subtab-icon', color: 'white' })}</button>
    <button data-subtab="services">${createMaterialIcon('language', { style: 'outlined', classes: 'subtab-icon', color: 'white' })}</button>
    <button data-subtab="dataManagement">${createMaterialIcon('storage', { style: 'outlined', classes: 'subtab-icon', color: 'white' })}</button>
</nav>

`; 