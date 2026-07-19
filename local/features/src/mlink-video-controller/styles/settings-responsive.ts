export const settingsResponsiveStyles = `

.management-btn.import {
  background: #5969a8;
  border: 1px solid #7887c0;
}

.management-btn.import:hover {
  background: #6879ba;
  transform: translateY(-2px);
  box-shadow: 0 4px 15px rgba(89, 105, 168, 0.28);
}

.management-btn.reset {
  background: #805d68;
  border: 1px solid #a17681;
}

.management-btn.reset:hover {
  background: #956b78;
  transform: translateY(-2px);
  box-shadow: 0 4px 15px rgba(128, 93, 104, 0.28);
}

@media (max-width: 600px) {
  .settings-management {
    flex-direction: column;
  }
  
  .management-btn {
    min-width: auto;
  }
}

`;
