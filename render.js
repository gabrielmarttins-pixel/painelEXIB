(() => {
// Renderização principal ainda mora em app.js; este módulo marca o limite da próxima extração.
const renderModuleReady = true;
window.GloboRender = { renderModuleReady };
})();

