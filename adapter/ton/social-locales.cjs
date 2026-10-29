'use strict';
// Localized routes are intentionally noindex until the UI and its content are reviewed.
// This module only describes the route and confirmed provider outcomes; it never
// translates user-provided metadata or derives extra facts from an entity ID.
const dictionaries = {
  es: {
    explorer: 'Explorador de TON', home: 'Explora bloques, transacciones, cuentas, jettons y NFT de TON.', master: 'Explora bloques, transacciones y actividad de la masterchain de TON.',
    entity: {tx:'Transacción',block:'Bloque',address:'Cuenta',nft:'NFT',collection:'Colección',jetton:'Jetton',trace:'Traza',message:'Mensaje'},
    view: (label,id) => `Consulta ${label.toLowerCase()} de TON ${id}.`, notFound: label => `${label} de TON no encontrado.`, unavailable:'Datos de TON temporalmente no disponibles. Inténtalo de nuevo.',
    pages: {jettons:['Jettons','Explora jettons indexados de TON, su oferta y sus metadatos.'],collections:['Colecciones NFT','Explora colecciones NFT de TON y sus elementos.'],market:['Mercado','Explora el historial de precios y las cotizaciones de GRAM.'],blocks:['Bloques','Explora bloques de la basechain y la masterchain de TON y sus referencias a shards.'],txs:['Transacciones','Explora transacciones recientes de TON en la masterchain y los shards.'],validators:['Validadores','Explora los validadores de TON y la configuración de la red.'],dns:['DNS','Explora dominios TON, propiedad, vencimientos y pujas.'],config:['Configuración de la red','Explora los parámetros de configuración de la red TON.'],docs:['Documentación','Aprende a explorar bloques, cuentas, jettons y NFT de TON con tx.taxi.'],about:['Acerca de','Información sobre el explorador TON y el enrutamiento automático con tx.taxi.'],legal:['Información legal','Información legal del explorador TON de tx.taxi.'],'staking-pool':['Pool de staking','Explora los parámetros de los pools de staking de TON y las observaciones de APY.'],'extra-currency':['Moneda adicional','Explora metadatos y transferencias de monedas adicionales de TON.']},
    faq:['Guía de TON','Explora transacciones, mensajes, carteras, jettons, NFT y validadores de TON.'], rest:['API REST de TON','Referencia de la API REST de TON para bloques, transacciones, mensajes, cuentas, jettons y NFT.'], websocket:['API WebSocket de TON','Referencia de la API WebSocket de TON para bloques en vivo de la basechain y la masterchain.'],
    facts: {'Next transaction':'Siguiente transacción','Transaction':'Transacción','Status':'Estado','Timestamp':'Fecha y hora','Account':'Cuenta','Logical time':'Tiempo lógico','Fee':'Comisión','Block':'Bloque','Incoming message':'Mensaje entrante','From':'De','To':'Para','Incoming value':'Valor entrante','Outgoing messages':'Mensajes salientes','Workchain':'Workchain','Shard':'Shard','Transactions':'Transacciones','Collected fees':'Comisiones recaudadas','Root hash':'Hash raíz','Name':'Nombre','Balance':'Saldo','Interfaces':'Interfaces','Address':'Dirección','Owner':'Propietario','Collection':'Colección','Index':'Índice','Approved by':'Aprobado por'}, statuses:{Confirmed:'Confirmada',Failed:'Fallida'}
  },
  fr: {
    explorer: 'Explorateur TON', home: 'Explorez les blocs, transactions, comptes, jettons et NFT de TON.', master: 'Explorez les blocs, transactions et activités de la masterchain TON.',
    entity: {tx:'Transaction',block:'Bloc',address:'Compte',nft:'NFT',collection:'Collection',jetton:'Jetton',trace:'Trace',message:'Message'},
    view: (label,id) => `Consultez ${label.toLowerCase()} TON ${id}.`, notFound: label => `${label} TON introuvable.`, unavailable:'Données TON temporairement indisponibles. Veuillez réessayer.',
    pages: {jettons:['Jettons','Explorez les jettons TON indexés, leur offre et leurs métadonnées.'],collections:['Collections NFT','Explorez les collections NFT TON et leurs éléments.'],market:['Marché','Explorez l’historique des prix et les cours du GRAM.'],blocks:['Blocs','Explorez les blocs de la basechain et de la masterchain TON et leurs références aux shards.'],txs:['Transactions','Explorez les transactions TON récentes de la masterchain et des shards.'],validators:['Validateurs','Explorez les validateurs TON et la configuration du réseau.'],dns:['DNS','Explorez les domaines TON, leur propriété, expiration et enchères.'],config:['Configuration du réseau','Explorez les paramètres de configuration du réseau TON.'],docs:['Documentation','Apprenez à explorer les blocs, comptes, jettons et NFT TON avec tx.taxi.'],about:['À propos','À propos de l’explorateur TON et du routage automatique avec tx.taxi.'],legal:['Mentions légales','Informations légales de l’explorateur TON tx.taxi.'],'staking-pool':['Pool de staking','Explorez les paramètres des pools de staking TON et les rendements annuels observés.'],'extra-currency':['Monnaie supplémentaire','Explorez les métadonnées et transferts des monnaies supplémentaires TON.']},
    faq:['Guide TON','Explorez les transactions, messages, portefeuilles, jettons, NFT et validateurs de TON.'], rest:['API REST TON','Référence de l’API REST TON pour les blocs, transactions, messages, comptes, jettons et NFT.'], websocket:['API WebSocket TON','Référence de l’API WebSocket TON pour les blocs en direct de la basechain et de la masterchain.'],
    facts:{'Next transaction':'Transaction suivante','Transaction':'Transaction','Status':'État','Timestamp':'Horodatage','Account':'Compte','Logical time':'Temps logique','Fee':'Frais','Block':'Bloc','Incoming message':'Message entrant','From':'De','To':'À','Incoming value':'Valeur entrante','Outgoing messages':'Messages sortants','Workchain':'Workchain','Shard':'Shard','Transactions':'Transactions','Collected fees':'Frais perçus','Root hash':'Hash racine','Name':'Nom','Balance':'Solde','Interfaces':'Interfaces','Address':'Adresse','Owner':'Propriétaire','Collection':'Collection','Index':'Index','Approved by':'Approuvé par'}, statuses:{Confirmed:'Confirmée',Failed:'Échouée'}
  },
  de: {
    explorer: 'TON-Explorer', home: 'Erkunde TON-Blöcke, Transaktionen, Konten, Jettons und NFTs.', master: 'Erkunde Blöcke, Transaktionen und Aktivitäten der TON-Masterchain.',
    entity: {tx:'Transaktion',block:'Block',address:'Konto',nft:'NFT',collection:'Sammlung',jetton:'Jetton',trace:'Trace',message:'Nachricht'},
    view: (label,id) => `TON ${label} ${id} ansehen.`, notFound: label => `TON ${label} nicht gefunden.`, unavailable:'TON-Daten sind vorübergehend nicht verfügbar. Bitte erneut versuchen.',
    pages: {jettons:['Jettons','Erkunde indexierte TON-Jettons, ihr Angebot und ihre Metadaten.'],collections:['NFT-Sammlungen','Erkunde TON-NFT-Sammlungen und ihre Elemente.'],market:['Markt','Erkunde den GRAM-Kursverlauf und aktuelle Kurse.'],blocks:['Blöcke','Erkunde TON-Basechain-Blöcke, Masterchain-Blöcke und Shard-Verweise.'],txs:['Transaktionen','Erkunde aktuelle TON-Transaktionen auf Masterchain und Shards.'],validators:['Validatoren','Erkunde TON-Validatoren und die Netzwerkkonfiguration.'],dns:['DNS','Erkunde TON-Domains, Eigentum, Ablauf und Gebote.'],config:['Netzwerkkonfiguration','Erkunde die Konfigurationsparameter des TON-Netzwerks.'],docs:['Dokumentation','Erfahre, wie du TON-Blöcke, Konten, Jettons und NFTs mit tx.taxi erkundest.'],about:['Über','Über den TON-Explorer und automatisches Routing mit tx.taxi.'],legal:['Rechtliches','Rechtliche Informationen zum TON-Explorer von tx.taxi.'],'staking-pool':['Staking-Pool','Erkunde Parameter von TON-Staking-Pools und beobachtete Jahresrenditen.'],'extra-currency':['Zusätzliche Währung','Erkunde Metadaten und Übertragungen zusätzlicher TON-Währungen.']},
    faq:['TON-Leitfaden','Erkunde TON-Transaktionen, Nachrichten, Wallets, Jettons, NFTs und Validatoren.'], rest:['TON REST API','TON REST API-Referenz für Blöcke, Transaktionen, Nachrichten, Konten, Jettons und NFTs.'], websocket:['TON WebSocket API','TON WebSocket API-Referenz für Live-Blöcke der Basechain und Masterchain.'],
    facts:{'Next transaction':'Nächste Transaktion','Transaction':'Transaktion','Status':'Status','Timestamp':'Zeitstempel','Account':'Konto','Logical time':'Logische Zeit','Fee':'Gebühr','Block':'Block','Incoming message':'Eingehende Nachricht','From':'Von','To':'An','Incoming value':'Eingehender Wert','Outgoing messages':'Ausgehende Nachrichten','Workchain':'Workchain','Shard':'Shard','Transactions':'Transaktionen','Collected fees':'Eingezogene Gebühren','Root hash':'Root-Hash','Name':'Name','Balance':'Guthaben','Interfaces':'Schnittstellen','Address':'Adresse','Owner':'Eigentümer','Collection':'Sammlung','Index':'Index','Approved by':'Genehmigt von'}, statuses:{Confirmed:'Bestätigt',Failed:'Fehlgeschlagen'}
  },
  pt: {
    explorer: 'Explorador TON', home: 'Explore blocos, transações, contas, jettons e NFTs de TON.', master: 'Explore blocos, transações e atividades da masterchain de TON.',
    entity: {tx:'Transação',block:'Bloco',address:'Conta',nft:'NFT',collection:'Coleção',jetton:'Jetton',trace:'Rastro',message:'Mensagem'},
    view: (label,id) => `Veja ${label.toLowerCase()} de TON ${id}.`, notFound: label => `${label} de TON não encontrado.`, unavailable:'Dados de TON temporariamente indisponíveis. Tente novamente.',
    pages: {jettons:['Jettons','Explore jettons TON indexados, sua oferta e seus metadados.'],collections:['Coleções NFT','Explore coleções NFT de TON e seus itens.'],market:['Mercado','Explore o histórico de preços e as cotações de GRAM.'],blocks:['Blocos','Explore blocos da basechain e da masterchain de TON e suas referências a shards.'],txs:['Transações','Explore transações recentes de TON na masterchain e nos shards.'],validators:['Validadores','Explore validadores de TON e a configuração da rede.'],dns:['DNS','Explore domínios TON, propriedade, vencimento e lances.'],config:['Configuração da rede','Explore os parâmetros de configuração da rede TON.'],docs:['Documentação','Saiba como explorar blocos, contas, jettons e NFTs de TON com o tx.taxi.'],about:['Sobre','Sobre o explorador TON e o roteamento automático com o tx.taxi.'],legal:['Informações legais','Informações legais do explorador TON do tx.taxi.'],'staking-pool':['Pool de staking','Explore parâmetros de pools de staking TON e observações de rendimento anual.'],'extra-currency':['Moeda adicional','Explore metadados e transferências de moedas adicionais de TON.']},
    faq:['Guia TON','Explore transações, mensagens, carteiras, jettons, NFTs e validadores de TON.'], rest:['API REST TON','Referência da API REST de TON para blocos, transações, mensagens, contas, jettons e NFTs.'], websocket:['API WebSocket TON','Referência da API WebSocket de TON para blocos em tempo real da basechain e da masterchain.'],
    facts:{'Next transaction':'Próxima transação','Transaction':'Transação','Status':'Estado','Timestamp':'Data e hora','Account':'Conta','Logical time':'Tempo lógico','Fee':'Taxa','Block':'Bloco','Incoming message':'Mensagem recebida','From':'De','To':'Para','Incoming value':'Valor recebido','Outgoing messages':'Mensagens enviadas','Workchain':'Workchain','Shard':'Shard','Transactions':'Transações','Collected fees':'Taxas coletadas','Root hash':'Hash raiz','Name':'Nome','Balance':'Saldo','Interfaces':'Interfaces','Address':'Endereço','Owner':'Proprietário','Collection':'Coleção','Index':'Índice','Approved by':'Aprovado por'}, statuses:{Confirmed:'Confirmada',Failed:'Falhou'}
  },
  it: {
    explorer: 'Esploratore TON', home: 'Esplora blocchi, transazioni, account, jetton e NFT di TON.', master: 'Esplora blocchi, transazioni e attività della masterchain TON.',
    entity: {tx:'Transazione',block:'Blocco',address:'Account',nft:'NFT',collection:'Collezione',jetton:'Jetton',trace:'Traccia',message:'Messaggio'},
    view: (label,id) => `Consulta ${label.toLowerCase()} TON ${id}.`, notFound: label => `${label} TON non trovato.`, unavailable:'Dati TON temporaneamente non disponibili. Riprova.',
    pages: {jettons:['Jetton','Esplora jetton TON indicizzati, offerta e metadati.'],collections:['Collezioni NFT','Esplora le collezioni NFT TON e i loro elementi.'],market:['Mercato','Esplora lo storico dei prezzi e le quotazioni GRAM.'],blocks:['Blocchi','Esplora i blocchi della basechain e della masterchain TON e i riferimenti agli shard.'],txs:['Transazioni','Esplora le transazioni recenti TON nella masterchain e negli shard.'],validators:['Validatori','Esplora i validatori TON e la configurazione della rete.'],dns:['DNS','Esplora i domini TON, proprietà, scadenze e offerte.'],config:['Configurazione di rete','Esplora i parametri di configurazione della rete TON.'],docs:['Documentazione','Scopri come esplorare blocchi, account, jetton e NFT TON con tx.taxi.'],about:['Informazioni','Informazioni sull’esploratore TON e sul routing automatico di tx.taxi.'],legal:['Informazioni legali','Informazioni legali dell’esploratore TON tx.taxi.'],'staking-pool':['Pool di staking','Esplora i parametri dei pool di staking TON e i rendimenti annuali osservati.'],'extra-currency':['Valuta aggiuntiva','Esplora metadati e trasferimenti delle valute aggiuntive TON.']},
    faq:['Guida TON','Esplora transazioni, messaggi, portafogli, jetton, NFT e validatori TON.'], rest:['API REST TON','Riferimento API REST TON per blocchi, transazioni, messaggi, account, jetton e NFT.'], websocket:['API WebSocket TON','Riferimento API WebSocket TON per blocchi in tempo reale della basechain e della masterchain.'],
    facts:{'Next transaction':'Transazione successiva','Transaction':'Transazione','Status':'Stato','Timestamp':'Data e ora','Account':'Account','Logical time':'Tempo logico','Fee':'Commissione','Block':'Blocco','Incoming message':'Messaggio in entrata','From':'Da','To':'A','Incoming value':'Valore in entrata','Outgoing messages':'Messaggi in uscita','Workchain':'Workchain','Shard':'Shard','Transactions':'Transazioni','Collected fees':'Commissioni raccolte','Root hash':'Hash radice','Name':'Nome','Balance':'Saldo','Interfaces':'Interfacce','Address':'Indirizzo','Owner':'Proprietario','Collection':'Collezione','Index':'Indice','Approved by':'Approvato da'}, statuses:{Confirmed:'Confermata',Failed:'Fallita'}
  },
  ru: {
    explorer: 'Обозреватель TON', home: 'Изучайте блоки, транзакции, аккаунты, джеттоны и NFT TON.', master: 'Изучайте блоки, транзакции и активность мастерчейна TON.',
    entity: {tx:'Транзакция',block:'Блок',address:'Аккаунт',nft:'NFT',collection:'Коллекция',jetton:'Джеттон',trace:'Трасса',message:'Сообщение'},
    view: (label,id) => `${label} TON ${id}.`, notFound: label => `${label} TON не найден.`, unavailable:'Данные TON временно недоступны. Попробуйте снова.',
    pages: {jettons:['Джеттоны','Изучайте индексированные джеттоны TON, их выпуск и метаданные.'],collections:['Коллекции NFT','Изучайте коллекции NFT TON и их элементы.'],market:['Рынок','Изучайте историю цены и котировки GRAM.'],blocks:['Блоки','Изучайте блоки бейсчейна и мастерчейна TON и ссылки на шарды.'],txs:['Транзакции','Изучайте последние транзакции TON в мастерчейне и шардах.'],validators:['Валидаторы','Изучайте валидаторов TON и конфигурацию сети.'],dns:['DNS','Изучайте домены TON, владельцев, сроки и ставки.'],config:['Конфигурация сети','Изучайте параметры конфигурации сети TON.'],docs:['Документация','Узнайте, как изучать блоки, аккаунты, джеттоны и NFT TON с помощью tx.taxi.'],about:['О проекте','Об обозревателе TON и автоматической маршрутизации tx.taxi.'],legal:['Правовая информация','Правовая информация обозревателя TON tx.taxi.'],'staking-pool':['Пул стейкинга','Изучайте параметры пулов стейкинга TON и наблюдаемую годовую доходность.'],'extra-currency':['Дополнительная валюта','Изучайте метаданные и переводы дополнительных валют TON.']},
    faq:['Руководство по TON','Изучайте транзакции, сообщения, кошельки, джеттоны, NFT и валидаторов TON.'], rest:['REST API TON','Справочник REST API TON: блоки, транзакции, сообщения, аккаунты, джеттоны и NFT.'], websocket:['WebSocket API TON','Справочник WebSocket API TON для блоков бейсчейна и мастерчейна в реальном времени.'],
    facts:{'Next transaction':'Следующая транзакция','Transaction':'Транзакция','Status':'Статус','Timestamp':'Время','Account':'Аккаунт','Logical time':'Логическое время','Fee':'Комиссия','Block':'Блок','Incoming message':'Входящее сообщение','From':'От','To':'Кому','Incoming value':'Входящая сумма','Outgoing messages':'Исходящие сообщения','Workchain':'Воркчейн','Shard':'Шард','Transactions':'Транзакции','Collected fees':'Собранные комиссии','Root hash':'Корневой хеш','Name':'Название','Balance':'Баланс','Interfaces':'Интерфейсы','Address':'Адрес','Owner':'Владелец','Collection':'Коллекция','Index':'Индекс','Approved by':'Одобрено'}, statuses:{Confirmed:'Подтверждена',Failed:'Не выполнена'}
  },
};
function localizeTonMetadata(meta, pathname, entity, site) {
  const parts = pathname.split('/').filter(Boolean);
  const dict = dictionaries[parts[0]];
  if (!dict) return meta;
  const page = parts[1];
  if (entity) {
    const label = dict.entity[entity.kind];
    if (!label) return meta;
    const displayId = entity.displayId || entity.id;
    meta.title = `${label} ${displayId} - TON - tx.taxi`;
    meta.description = meta.status === 404 ? dict.notFound(label) : meta.status === 503 ? dict.unavailable : dict.view(label, displayId);
    meta.line1 = label;
    meta.summary = meta.description;
    meta.type = `TON / ${label}`;
    meta.facts = meta.facts.map(fact => ({...fact, label:dict.facts[fact.label] || fact.label, value:fact.label === 'Status' ? (dict.statuses[fact.value] || fact.value) : fact.value}));
    return meta;
  }
  let item = dict.pages[page];
  if (page === 'docs') {
    if (parts[2] === 'faq') item = dict.faq;
    else if (parts[2] === 'api' && parts[3] === 'rest') item = dict.rest;
    else if (parts[2] === 'api' && parts[3] === 'websocket') item = dict.websocket;
  }
  if (item) {
    let id = '';
    if (['dns','staking-pool','extra-currency'].includes(page) && parts[2]) {
      try { id = decodeURIComponent(parts[2]); } catch {}
    }
    meta.title = `${item[0]}${id ? ' ' + id : ''} - ${site.host} - ${dict.explorer}`;
    meta.description = item[1];
    meta.line1 = item[0];
    meta.summary = item[1];
    meta.type = `TON / ${item[0]}`;
  } else if (!page) {
    meta.title = `${site.host} - ${dict.explorer}`;
    meta.description = site.workchain === -1 ? dict.master : dict.home;
    meta.summary = meta.description;
  }
  return meta;
}
module.exports = {localizeTonMetadata};
