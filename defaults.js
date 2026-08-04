(() => {
const weekdayNews = [
  { name: 'BOM DIA DF', start: '06:00', production: '02:20:00', notes: '', _default: true },
  { name: 'DF1', start: '11:45', production: '01:05:00', notes: '', _default: true },
  { name: 'GLOBO ESPORTE', start: '13:00', production: '00:18:00', notes: '', _default: true },
  { name: 'DF2', start: '19:00', production: '00:30:00', notes: '', _default: true }
];

const strategyPrograms = {
  weekday: ['Edição Especial', 'Sessão da Tarde', 'Vale a Pena Ver de Novo', 'Novela I', 'Novela II'],
  saturday: ['Edição Especial', 'Sessão de Sábado', 'Caldeirão', 'Novela I', 'Novela II'],
  sunday: ['Temperatura Máxima', 'Em Família', 'Domingão com Huck']
};

const wednesdayNote = {
  subject: 'Previsão do Globo Comunidade',
  text: 'Enviar a previsão do GCO. Verificar produção e horário de entrada no GradeWeb.',
  category: 'Grade',
  _default: true
};

const fridayProgram = {
  name: 'GLOBO COMUNIDADE',
  start: '',
  duration: '',
  ids: '',
  status: 'Em preparação',
  _default: true
};

const day27Highlight = {
  title: 'Atualizar break de emergência',
  details: 'Atualizar junto ao Mestre Íon o break de emergência',
  category: 'Rotina',
  priority: 'Alta',
  _default: true
};

window.GloboDefaults = {
  weekdayNews,
  strategyPrograms,
  wednesdayNote,
  fridayProgram,
  day27Highlight
};
})();

