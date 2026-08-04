(() => {
const STORAGE_KEY = 'globo-df-exibicao-v3-global';
const LEGACY_STORAGE_KEY = 'globo-df-exibicao-v1';
const DATE_STORAGE_KEY = 'globo-df-exibicao-v2';

const SUPABASE_URL = 'https://kveoxuqzywebqmtgtaho.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt2ZW94dXF6eXdlYnFtdGd0YWhvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIyMTc1OTAsImV4cCI6MjA5Nzc5MzU5MH0.pmyZERMf6iwrwlEEXYrqKHngyqRyR1aXk1Jxtl1AUM0';
const SUPABASE_TABLE = 'relatorios_exibicao';

const USER_NAME_KEY = 'globo-df-exibicao-user-name';
const SYNC_INTERVAL_MS = 120000;
const HISTORY_LIMIT = 25;

const sections = {
  highlights: { container: 'highlights', template: 'highlightTemplate', empty: 'Nenhum destaque adicionado.' },
  news: { container: 'news', template: 'newsTemplate', empty: 'Nenhum jornal adicionado.' },
  strategy: { container: 'strategy', template: 'strategyTemplate', empty: 'Nenhum programa de grade adicionado.' },
  games: { container: 'games', template: 'gameTemplate', empty: 'Nenhum jogo adicionado.' },
  programs: { container: 'programs', template: 'programTemplate', empty: 'Nenhum programa adicionado.' },
  notes: { container: 'notes', template: 'noteTemplate', empty: 'Nenhuma informação adicionada.' },
  links: { container: 'links', template: 'linkTemplate', empty: 'Nenhum link adicionado.' }
};

const newsPresenters = {
  'BOM DIA DF': 'assets/apresentadores/bom-dia-df.png',
  'DF1': 'assets/apresentadores/df1.png',
  'DF2': 'assets/apresentadores/df2.png',
  'GLOBO ESPORTE': 'assets/apresentadores/globo-esporte.png'
};

const teamCrests = {
  'Athletico-PR': 'assets/escudos/athletico-pr.png',
  'Atlético-MG': 'assets/escudos/atletico-mg.png',
  'Bahia': 'assets/escudos/bahia.png',
  'Botafogo': 'assets/escudos/botafogo.png',
  'Chapecoense': 'assets/escudos/chapecoense.png',
  'Corinthians': 'assets/escudos/corinthians.png',
  'Coritiba': 'assets/escudos/coritiba.png',
  'Cruzeiro': 'assets/escudos/cruzeiro.png',
  'Flamengo': 'assets/escudos/flamengo.png',
  'Fluminense': 'assets/escudos/fluminense.png',
  'Grêmio': 'assets/escudos/gremio.png',
  'Internacional': 'assets/escudos/internacional.png',
  'Mirassol': 'assets/escudos/mirassol.png',
  'Palmeiras': 'assets/escudos/palmeiras.png',
  'RB Bragantino': 'assets/escudos/rb-bragantino.png',
  'Remo': 'assets/escudos/remo.png',
  'Santos': 'assets/escudos/santos.png',
  'São Paulo': 'assets/escudos/sao-paulo.png',
  'Vasco': 'assets/escudos/vasco.png',
  'Vitória': 'assets/escudos/vitoria.png'
};

const countryCodes = {
  brasil:'BR', argentina:'AR', uruguai:'UY', paraguai:'PY', chile:'CL', colombia:'CO', equador:'EC', peru:'PE', bolivia:'BO', venezuela:'VE',
  mexico:'MX', 'estados unidos':'US', eua:'US', canada:'CA', 'costa rica':'CR', panama:'PA', honduras:'HN', jamaica:'JM',
  alemanha:'DE', franca:'FR', espanha:'ES', portugal:'PT', italia:'IT', inglaterra:'GB-ENG', escocia:'GB-SCT', 'pais de gales':'GB-WLS', gales:'GB-WLS', irlanda:'IE', 'irlanda do norte':'GB-NIR',
  holanda:'NL', 'paises baixos':'NL', belgica:'BE', croacia:'HR', suica:'CH', austria:'AT', dinamarca:'DK', suecia:'SE', noruega:'NO', polonia:'PL', servia:'RS', turquia:'TR', grecia:'GR', ucrania:'UA', russia:'RU',
  japao:'JP', 'coreia do sul':'KR', coreia:'KR', china:'CN', australia:'AU', 'nova zelandia':'NZ', 'arabia saudita':'SA', catar:'QA', ira:'IR',
  marrocos:'MA', senegal:'SN', egito:'EG', nigeria:'NG', camaroes:'CM', gana:'GH', 'africa do sul':'ZA', argelia:'DZ', tunisia:'TN', 'costa do marfim':'CI',
  congo:'CG', 'republica do congo':'CG', 'congo brazzaville':'CG', 'republica democratica do congo':'CD', 'rd congo':'CD', 'dr congo':'CD', 'congo kinshasa':'CD',
  brasileira:'BR', uruguaia:'UY', paraguaia:'PY', chilena:'CL', colombiana:'CO', equatoriana:'EC', peruana:'PE', boliviana:'BO', venezuelana:'VE', mexicana:'MX', americana:'US', canadense:'CA',
  alema:'DE', francesa:'FR', espanhola:'ES', portuguesa:'PT', italiana:'IT', inglesa:'GB-ENG', escocesa:'GB-SCT', galesa:'GB-WLS', 'norte-irlandesa':'GB-NIR', 'norte irlandesa':'GB-NIR',
  holandesa:'NL', belga:'BE', croata:'HR', dinamarquesa:'DK', sueca:'SE', norueguesa:'NO', polonesa:'PL', turca:'TR', grega:'GR', ucraniana:'UA',
  japonesa:'JP', 'sul-coreana':'KR', chinesa:'CN', australiana:'AU', marroquina:'MA', senegalesa:'SN', egipcia:'EG', nigeriana:'NG', camaronesa:'CM', ganesa:'GH', congolesa:'CG'
};

window.GloboConfig = {
  STORAGE_KEY,
  LEGACY_STORAGE_KEY,
  DATE_STORAGE_KEY,
  SUPABASE_URL,
  SUPABASE_KEY,
  SUPABASE_TABLE,
  USER_NAME_KEY,
  SYNC_INTERVAL_MS,
  HISTORY_LIMIT,
  sections,
  newsPresenters,
  teamCrests,
  countryCodes
};
})();

