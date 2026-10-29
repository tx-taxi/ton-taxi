import { TonDocItem } from './ton-docs-data';

// Source-fingerprinted translations; endpoints and examples remain unchanged.
const categories: Record<string, string> = {
  "TON basics": "Basisprincipes van TON",
  "Wallets and contracts": "Wallets en contracten",
  "Jettons and NFTs": "Jettons en NFT’s",
  "Using tx.taxi": "tx.taxi gebruiken",
  "Conventions": "Conventies",
  "Network and blocks": "Netwerk en blokken",
  "Transactions and messages": "Transacties en berichten",
  "Accounts and contracts": "Accounts en contracten",
  "NFTs and jettons": "NFT’s en jettons",
  "Live block updates": "Live blokupdates",
  "Network": "Netwerk",
  "Transactions": "Transacties",
  "Accounts": "Accounts",
  "Contracts": "Contracten",
  "Jettons": "Jettons",
  "NFTs": "NFT’s",
  "Collectibles": "Verzamelobjecten",
  "Assets": "Activa",
  "Search": "Zoeken",
  "Live data": "Live gegevens",
  "Support": "Ondersteuning",
  "Reference": "Referentie",
  "Blocks": "Blokken",
  "Messages": "Berichten",
  "Connection": "Verbinding",
  "State": "Status"
};
const entries: Record<string, [string, string]> = {
  "masterchain-and-shards": [
    "Wat betekenen masterchain- en shardblokken?",
    "<p>De masterchain bevat de globale configuratie en verwijzingen naar de toestanden van shardchains. De meeste gebruikersaccounts bevinden zich in de basechain, die in shards kan worden verdeeld. Een blok wordt geïdentificeerd door de combinatie van workchain, shard en volgnummer; een volgnummer alleen is geen blokhoogte voor het hele netwerk.</p><p>De bovenste reeks toont basechainblokken. Open het zoekmenu en kies Masterchain onder GESELECTEERD om masterchainblokken te bekijken. Kies een shard wanneer er meerdere actief zijn. Open een blok om de transacties te bekijken; masterchainblokken verwijzen ook naar de bijbehorende shards.</p>"
  ],
  "transactions-and-messages": [
    "Hoe hangen transacties, berichten en traces samen?",
    "<p>Een transactie legt vast hoe één account een bericht of systeemhandeling verwerkt. Berichten verbinden accounts; de verwerking van een inkomend bericht kan uitgaande berichten en verdere transacties opleveren. Een trace volgt deze verbonden transacties.</p><p>Gebruik de transactiepagina voor lokale uitvoering, berichten voor overdrachten tussen contracten en de trace voor de bredere operatie. <a href=\"https://docs.ton.org/start-here\" target=\"_blank\" rel=\"noopener noreferrer\">Basisprincipes van TON</a>.</p>"
  ],
  "logical-time": [
    "Wat is logische tijd?",
    "<p>Logische tijd (LT) ordent transacties en berichten. Dit staat los van de Unix-tijdstempel die als transactiedatum wordt weergegeven. De accountgeschiedenis gebruikt LT als paginatiecursor; bewaar deze als een exacte tekenreeks van een geheel getal.</p>"
  ],
  "fees-and-phases": [
    "Waar zijn de kosten naartoe gegaan?",
    "<p>Uitvoering kan opslag-, crediterings-, berekenings-, actie- en terugkaatsfasen omvatten. De transactiepagina toont de totale kosten en vastgelegde fasegegevens, waaronder gasverbruik, doorstuurkosten en afsluitcodes. Ook een mislukte operatie kan kosten betalen.</p><p>GRAM is de native valuta van TON en gebruikt 9 decimalen: 1 GRAM = 1,000,000,000 nanogram. De waarde van een bericht en de transactiekosten zijn verschillende bedragen.</p>"
  ],
  "bounce-and-failure": [
    "Wat betekent teruggekaatst of mislukt?",
    "<p>Een teruggekaatst bericht geeft een antwoord terug wanneer een bericht dat kan terugkaatsen niet volgens de toepasselijke regels kan worden verwerkt. Het is een afzonderlijk bericht met een eigen waarde en kosten. Controleer het transactieresultaat, de resultaten van berekening en acties en de uitgaande berichten samen.</p><p>Een bevestigde transactie kan een mislukte uitvoering hebben. Eén geslaagde transactie bewijst ook niet dat alle latere transacties in de trace zijn geslaagd. <a href=\"https://docs.ton.org/resources/pdfs/tblkch.pdf\" target=\"_blank\" rel=\"noopener noreferrer\">Blockchainspecificatie van TON</a>.</p>"
  ],
  "confirmation": [
    "Is een bevestiging hetzelfde als een voltooide operatie?",
    "<p>Bevestiging betekent dat de transactie in haar blok is opgenomen. Een operatie met meerdere contracten kan aanvullende transacties en berichten omvatten. Bekijk de volledige trace en de uiteindelijke ontvanger in plaats van de eerste transactie als de volledige overdracht te beschouwen.</p>"
  ],
  "wallets-and-state": [
    "Wat toont een accountpagina?",
    "<p>Accounts tonen hun GRAM-saldo, status, laatste activiteit en herkende contractinterfaces. Geschiedenis groepeert herkende acties; Transacties vermeldt de accounttransacties. Jettons en NFT's hebben aparte tabbladen.</p><p>Het tabblad Contract bevat status, code en gegevens, alleen-lezenmethoden en beschikbare records voor staking, multisig, abonnementen en DeFi. Vouw Accountgegevens uit voor aanvullende velden en extra valuta.</p>"
  ],
  "addresses-and-dns": [
    "Waarom kan hetzelfde account verschillende adressen hebben?",
    "<p>Accounts op TON kunnen worden weergegeven als een ruwe workchain en hexadecimale account-ID of als een gebruiksvriendelijk adres. Terugkaats- en netwerkvlaggen kunnen de gebruiksvriendelijke weergave wijzigen zonder het onderliggende account te veranderen.</p><p>Zoeken accepteert TON-adressen en .ton-namen. DNS-resolutie verwijst naar het opgeloste account; een domeinnaam vervangt de controle van het accountadres niet.</p>"
  ],
  "contract-methods": [
    "Kan ik een smart contract lezen?",
    "<p>Kies een vermelde leesmethode op het tabblad Contract en geef zo nodig argumenten op. Een leesaanvraag geeft een resultaat zonder een transactie te ondertekenen. Argumenten kunnen door komma's gescheiden tekenreeksen of een JSON-array van tekenreeksen zijn; bewaar grote gehele getallen als tekenreeksen.</p><p>Accountgegevens bewaren code-, data- en opslagvelden. Inspectie toont herkende interfaces en beschikbare compilerinformatie.</p>"
  ],
  "validators": [
    "Wat toont de validatorpagina?",
    "<p>De validatorpagina toont de tijdstippen van de verkiezing, de totale en minimale stake en de accounts, stakes en ADNL-adressen van deelnemende validators. Deze velden beschrijven de getoonde verkiezingsgegevens; een adres met stake is niet automatisch de producent van een bepaald blok.</p>"
  ],
  "jettons": [
    "Hoe werken jettons?",
    "<p>Een jetton heeft een mastercontract en afzonderlijke jetton-walletcontracten voor houders. Identificeer deze aan de hand van het masteradres, niet de naam of het symbool. De jettonpagina toont de voorraad, decimalen, administratie en houders.</p><p>Geef saldi weer met de eigen decimalen van de jetton. Ga er niet van uit dat elke jetton 9 decimalen heeft. <a href=\"https://docs.ton.org/contracts/standard/tokens/jettons/overview\" target=\"_blank\" rel=\"noopener noreferrer\">Jettonstandaard</a>.</p>"
  ],
  "scaled-jettons": [
    "Waarom kan het weergegeven jettonsaldo afwijken van het bedrag op de blockchain?",
    "<p>Sommige jettons gebruiken een weergavemultiplicator. Huidige wallet- en houderssaldi en de totale voorraad passen die verhouding toe met exacte afronding, gevolgd door de decimalen van de token. Vouw Bedraggegevens uit voor het bedrag op de blockchain, ruwe eenheden en de verhouding.</p><p>Historische overdrachten behouden de op de blockchain vastgelegde hoeveelheid; de huidige multiplicator bewijst niet welke multiplicator toen gold. <a href=\"https://github.com/ton-blockchain/TEPs/blob/master/text/0526-scaled-ui-jettons.md\" target=\"_blank\" rel=\"noopener noreferrer\">Standaard voor geschaalde jettonweergave</a>.</p>"
  ],
  "nft-identity": [
    "Wat identificeert een NFT?",
    "<p>Het contractadres van het NFT-item bepaalt zijn identiteit. De collectie, eigenaar en itemindex zijn afzonderlijke velden. Verificatie van collectielidmaatschap controleert de relatie van het item met een collectie; dit bewijst niet dat de afbeelding, naam of verkoper betrouwbaar is.</p><p>Itemgegevens tonen de exacte index wanneer die door het NFT-contract is bevestigd. Een weergegeven nummer in een NFT-naam hoeft niet gelijk te zijn aan de index op de blockchain.</p>"
  ],
  "nft-metadata": [
    "Waar komen afbeeldingen en eigenschappen vandaan?",
    "<p>TEP-64 ondersteunt metadata op de blockchain, daarbuiten en gecombineerd. De NFT-pagina toont namen, beschrijvingen, afbeeldingen en eigenschappen; de volledige metadata kan worden uitgevouwen. Elders gehoste media of metadata kunnen veranderen of niet beschikbaar worden.</p><p>Open animaties bewust vanaf de itempagina. Ontbrekende media wissen het NFT-contract of de eigendomsregistratie niet. <a href=\"https://github.com/ton-blockchain/TEPs/blob/master/text/0064-token-data-standard.md\" target=\"_blank\" rel=\"noopener noreferrer\">Standaard voor tokenmetadata</a>.</p>"
  ],
  "nft-sales": [
    "Waarom is een NFT eigendom van een verkoopcontract?",
    "<p>Een aangeboden NFT kan worden bewaard door een verkoopcontract van een marktplaats. NFT-lijsten van wallets bevatten herkend indirect eigendom via een verkoop. De itempagina onderscheidt de eigenaar op de blockchain, verkoper, het verkoopcontract en de prijsvaluta.</p><p>Een verkoopaanbieding is geen voltooide overdracht. Gebruik de overdrachtsgeschiedenis om wijzigingen te volgen en de collectiepagina om items te bekijken.</p>"
  ],
  "telegram-collectibles": [
    "Zijn alle Telegram-cadeaus zichtbaar op de blockchain?",
    "<p>Nee. Een cadeau moet als TON-NFT bestaan om hier een itemadres en eigendomsregistratie op de blockchain te hebben. Telegram-cadeaus, verzamelbare gebruikersnamen en nummers kunnen gekoppelde TON-NFT's hebben, maar een Telegram-profiel of gewone gebruikersnaam bewijst op zichzelf geen walletbezit.</p><p>Een verzamelobject kan op een Telegram-profiel worden weergegeven terwijl een TON-wallet eigenaar blijft. Controleer het itemadres, de collectie en de huidige eigenaar. <a href=\"https://core.telegram.org/api/gifts\" target=\"_blank\" rel=\"noopener noreferrer\">Verzamelbare Telegram-cadeaus</a>.</p>"
  ],
  "nft-pagination": [
    "Hoe bekijk ik alle NFT's in een account of collectie?",
    "<p>Gebruik Meer laden onder de NFT-lijst om verder door de collectie of wallet te bladeren. Het NFT-tabblad toont elk teruggegeven item afzonderlijk, met de volledige naam en een link naar de details. De NFT-collectie van een wallet en de transactiegeschiedenis zijn onafhankelijke lijsten.</p>"
  ],
  "trust-and-identity": [
    "Wat betekenen herkenningslabels?",
    "<p>Collectielidmaatschap, vertrouwensclassificatie en goedkeuringen van marktplaatsen zijn verschillende feiten. Herkende namen en afbeeldingen bewijzen geen eigendom. Vergelijk contractadressen en collectielinks voordat u twee activa met vergelijkbare namen als dezelfde token beschouwt.</p>"
  ],
  "automatic-routing": [
    "Hoe werkt automatische routering?",
    "<p>Plak een adres, transactiehash, berichthash, bloknummer of .ton-naam in de zoekbalk. Met Automatische routering vindt de taxi de bijbehorende blockchain. Door een eigen explorer te kiezen blijft zoeken op die blockchain beschikbaar; Hub bekijken brengt u terug naar tx.taxi.</p>"
  ],
  "updates": [
    "Wat betekent ‘Updates vertraagd’?",
    "<p>De laatst beschikbare gegevens blijven zichtbaar zolang nieuwe updates vertraagd zijn. Probeer een niet-beschikbaar onderdeel opnieuw te laden. Een lege lijst en een niet-beschikbare lijst zijn verschillende situaties.</p>"
  ],
  "wallet-support": [
    "Kan tx.taxi een transactie terugdraaien?",
    "<p>tx.taxi toont openbare blockchaingegevens. Het kan geen transacties ondertekenen, toegang krijgen tot privésleutels of een overdracht terugdraaien. Neem voor ondersteuning bij een wallet of beursaccount contact op met de dienst die de operatie heeft ingediend.</p>"
  ],
  "api-values": [
    "Waarden en paginatie",
    "<p>Alle onderstaande routes gebruiken GET. Gehele getallen waarvoor precisie belangrijk is, zijn decimale tekenreeksen; verwerk ze met willekeurige precisie. GRAM-saldi en -kosten zijn nanogrammen. Jettonbedragen gebruiken hun opgegeven decimalen.</p><p>Gepagineerde antwoorden bevatten <code>_paging</code>. Ga alleen verder zolang <code>hasMore</code> waar is en gebruik <code>nextOffset</code>, <code>nextBeforeLt</code> of <code>nextBefore</code> voor het betreffende eindpunt. Lijstlimieten zijn maximaal 100; bloklijsten maximaal 16.</p><p><code>_meta.observedAt</code> geeft het waarnemingstijdstip aan en <code>_meta.stale</code> markeert bewaarde gegevens. HTTP 400 betekent ongeldige invoer, 404 niet gevonden en 503 tijdelijk niet beschikbaar.</p>"
  ],
  "get-dashboard": [
    "Netwerkoverzicht",
    "<p>Geeft de geselecteerde workchain en shard, recente blokken, waargenomen geschiedenis, het waarnemingstijdstip en de status van verouderde gegevens terug. Standaard wordt de basechain gebruikt. Gebruik <code>workchain=-1</code> voor de masterchain of <code>workchain=0&amp;shard=...</code> voor een actieve basechainshard. <code>activeShards</code> vermeldt de beschikbare shards; <code>masterchainHead</code> is de actuele masterchaintop van het netwerk.</p>"
  ],
  "get-blocks": [
    "Blokken",
    "<p>Geeft blokken van één workchain en shard terug in aflopende volgorde van volgnummers. De basechain is standaard; gebruik <code>workchain=-1</code> voor masterchainblokken. Ga verder met <code>before=_paging.nextBefore</code> en behoud <code>workchain</code> en <code>shard</code> uit het antwoord; de grens is exclusief. Paginatie stopt bij een splitsing of samenvoeging van shards.</p>"
  ],
  "get-block": [
    "Blokgegevens",
    "<p>Gebruik een volgnummer of de volledige <code>(workchain,shard,seqno)</code>-identificatie. Een volgnummer gebruikt de geselecteerde workchain en shard; zonder selectie gebruikt het de standaardworkchain van de host en de rootshard. Geeft hashes, tijdstempels, logische tijden, verwijzingen en waardeoverdrachtvelden terug.</p>"
  ],
  "get-block-transactions": [
    "Bloktransacties",
    "<p>Geeft de transacties terug die in het opgegeven blok zijn opgenomen.</p>"
  ],
  "get-block-shards": [
    "Shardverwijzingen van de masterchain",
    "<p>Gebruik een masterchainvolgnummer of masterchainblokidentificatie. Geeft de bijbehorende shardverwijzingen terug.</p>"
  ],
  "get-network-transactions": [
    "Netwerktransacties",
    "<p>Geeft transacties uit de shards binnen één masterchaininterval terug. Ga binnen dat interval verder met <code>master_seqno=_paging.masterSeqno</code> en <code>offset=_paging.nextOffset</code>. Wanneer <code>nextOffset</code> null is, gaat u verder met <code>before=_paging.nextBefore</code>. Limieten zijn maximaal 50.</p>"
  ],
  "get-transactions": [
    "Masterchaintransacties",
    "<p>Geeft transacties uit één masterchainblok terug. Ga verder met <code>before=_paging.nextBefore</code>. Dit zijn masterchaintransacties, niet alle transacties in alle shards.</p>"
  ],
  "get-validators": [
    "Validators",
    "<p>Geeft informatie over validatorverkiezingen, stakebedragen en validatorrecords terug.</p>"
  ],
  "get-dns": [
    "Domeingegevens",
    "<p>Domeinidentiteit, verloopdatum en gekoppelde NFT. Voeg <code>/resolve</code> toe voor wallet-, site-, opslag- en resolverrecords of <code>/bids</code> voor de biedgeschiedenis.</p>"
  ],
  "get-auctions": [
    "DNS-veilingen",
    "<p>Huidige domeinveilingen. Kies <code>ton</code> of <code>t.me</code>.</p>"
  ],
  "get-dns-expiring": [
    "Aflopende domeinen",
    "<p>Geeft domeinen terug waarvan de vervaldatum nadert. De optionele parameter <code>period</code> is het aantal dagen tot die datum.</p>"
  ],
  "get-staking-pool": [
    "Stakingpool",
    "<p>Poolstake, nominators, cyclus, implementatie en jaarlijks rendement. Voeg <code>/history</code> toe voor de waargenomen APY-geschiedenis.</p>"
  ],
  "get-extra-currency": [
    "Extra valuta",
    "<p>Valuta-ID, symbool, aantal decimalen en afbeelding.</p>"
  ],
  "get-extra-currency-history": [
    "Geschiedenis van extra valuta",
    "<p>Accountgebeurtenissen voor de geselecteerde valuta. Ga verder met <code>before_lt</code>.</p>"
  ],
  "get-block-boc": [
    "BOC van een blok",
    "<p>Downloadt het blok als een binaire Bag of Cells.</p>"
  ],
  "get-config-raw": [
    "Ruwe configuratie",
    "<p>Ruwe netwerkconfiguratie. Voeg <code>master_seqno</code> toe om een historische masterchainconfiguratie op te vragen.</p>"
  ],
  "get-config": [
    "Blockchainconfiguratie",
    "<p>Geeft gedecodeerde parameters van de blockchainconfiguratie terug. Voeg <code>master_seqno</code> toe voor een historische masterchainconfiguratie.</p>"
  ],
  "get-rates": [
    "Wisselkoersen van GRAM",
    "<p>Geeft GRAM-koersen in AUD, CAD, CHF, EUR, GBP, JPY en USD terug.</p>"
  ],
  "get-transaction": [
    "Transactiedetails",
    "<p>Geeft de accounttransactie, berichten, kosten, fasen en statuswijzigingen terug, plus beschikbare trace- en geïnterpreteerde gebeurtenisdetails. <code>relatedUnavailable</code> vermeldt gerelateerde onderdelen die niet konden worden geladen.</p>"
  ],
  "get-message": [
    "Transactie op berichthash",
    "<p>Zoekt de transactie die bij de opgegeven berichthash hoort.</p>"
  ],
  "get-trace": [
    "Trace",
    "<p>Geeft de boom van gekoppelde transacties terug, met onderliggende traces en uitvoeringsdetails.</p>"
  ],
  "resolve": [
    "Zoekinvoer herkennen",
    "<p>Herkent een TON-account, NFT, collectie, jetton, transactie, berichthash, blok-ID of .ton-domein. Geeft het type en de ID van de entiteit terug.</p>"
  ],
  "get-account": [
    "Accountdetails",
    "<p>Geeft saldo, status, contractinterfaces, beschikbare blockchainstatus en DNS-namen terug. De status kan code, gegevens, opslaginformatie en extra valuta bevatten.</p>"
  ],
  "get-account-transactions": [
    "Accounttransacties",
    "<p>Toont de accounttransacties. Ga verder met <code>before_lt=_paging.nextBeforeLt</code>; <code>after_lt</code> wordt ook ondersteund.</p>"
  ],
  "get-account-events": [
    "Accountoverdrachten en -gebeurtenissen",
    "<p>Geeft geïnterpreteerde acties en hun status terug. Ga verder met <code>before_lt</code>.</p>"
  ],
  "get-account-jettons": [
    "Jettonsaldi",
    "<p>Geeft saldi terug met metadata van het hoofdcontract en de jettonwalletadressen van het account.</p>"
  ],
  "get-account-nfts": [
    "NFT's van het account",
    "<p>Geeft NFT-items terug, standaard inclusief herkend indirect eigendom via verkoop. Filter met <code>collection</code> of gebruik <code>indirect_ownership=false</code> voor uitsluitend direct eigendom. Ga verder met <code>offset=_paging.nextOffset</code>.</p>"
  ],
  "get-account-nft-history": [
    "NFT-bewerkingen",
    "<p>Geeft de NFT-bewerkingen van het account terug. Ga verder met <code>before_lt</code>.</p>"
  ],
  "get-account-jetton-history": [
    "Jettonhistorie",
    "<p>Geeft jettongebeurtenissen voor het account terug. Ga verder met <code>before_lt</code>.</p>"
  ],
  "get-inspect": [
    "Contractinspectie",
    "<p>Geeft beschikbare contractinspectiedetails en herkende interfaces terug.</p>"
  ],
  "get-method": [
    "Contractmethode lezen",
    "<p>Voert een alleen-lezen-getter uit. Geef elk argument op als een herhaalde parameter <code>args</code>, bijvoorbeeld <code>?args=123&args=456</code>. Argumenten blijven strings en kunnen gehele getallen, adressen of BOC-waarden bevatten die de methode accepteert.</p>"
  ],
  "get-staking": [
    "Stakingpools",
    "<p>Geeft de posities van het account in nominatorpools terug.</p>"
  ],
  "get-multisig": [
    "Multisigcontract",
    "<p>Geeft de drempel, ondertekenaars, voorstellers, het volgnummer en de opdrachten van het multisigcontract terug. Gebruik de meervoudsroute hieronder om multisigs te vinden die bij de wallet van een ondertekenaar horen.</p>"
  ],
  "get-multisigs": [
    "Multisigregistraties",
    "<p>Geeft multisigregistraties terug die bij het account horen.</p>"
  ],
  "get-subscriptions": [
    "Abonnementen",
    "<p>Geeft de abonnementsregistraties van het account terug.</p>"
  ],
  "get-defi": [
    "DeFi-activa",
    "<p>Geeft herkende DeFi-posities en -activa van het account terug.</p>"
  ],
  "get-nft": [
    "NFT-item",
    "<p>Geeft de eigenaar, collectie, metadata, mediavoorbeelden en vertrouwens- en verkoopvelden van het item terug. <code>indexVerified</code> geeft aan of <code>index</code> is bevestigd door <code>get_nft_data</code>; de oorspronkelijke index blijft in <code>indexed_index</code>.</p>"
  ],
  "get-sbt": [
    "Soulbound NFT-details",
    "<p>Geeft voor een soulbound NFT het bevoegdheidsadres en het tijdstip van intrekking uit het contract terug. Een intrekkingstijdstip van nul betekent dat het item niet is ingetrokken. Soulbound items zijn niet overdraagbaar.</p>"
  ],
  "get-nft-history": [
    "NFT-geschiedenis",
    "<p>Geeft gebeurtenissen voor één NFT terug. Ga verder met <code>before_lt</code>.</p>"
  ],
  "get-collection": [
    "Collectiedetails",
    "<p>Geeft de eigenaar, inhoud, metadata en voorbeelden van de collectie terug. Als <code>indexVerified</code> true is, wordt <code>next_item_index</code> bevestigd door de getter van de collectie; dit is niet noodzakelijk het totale aantal items.</p>"
  ],
  "get-collection-items": [
    "Collectie-items",
    "<p>Geeft NFT-items uit een collectie terug. Ga verder met <code>offset=_paging.nextOffset</code>.</p>"
  ],
  "get-jetton": [
    "Jettondetails",
    "<p>Geeft metadata van het hoofdcontract, het totale aanbod, beheer, decimalen en het aantal houders terug.</p>"
  ],
  "get-jetton-holders": [
    "Jettonhouders",
    "<p>Geeft houdersvermeldingen terug onder <code>addresses</code>. Ga verder met <code>offset=_paging.nextOffset</code>. Saldowaarden gebruiken het aantal decimalen van de jetton.</p>"
  ],
  "websocket-connect": [
    "Verbinden",
    "<p>Maak verbinding met dezelfde host op <code>/api/v1/ws</code> en stuur <code>init</code> voor de huidige momentopname. Basechainblokken zijn standaard geselecteerd. Voeg <code>?workchain=-1</code> toe voor de masterchain, of <code>?workchain=0&amp;shard=...</code> voor een basechainshard. Gebruik REST API voor afzonderlijke accounts, NFT's, transacties en traces.</p>"
  ],
  "websocket-init": [
    "Huidige momentopname",
    "<p>Het antwoord bevat recente genormaliseerde <code>blocks</code> van de geselecteerde workchain en shard, plus een <code>ton</code>-object met het nieuwste blok, de waargenomen geschiedenis, het waarnemingstijdstip en de verouderingsstatus. Gebruik <code>ton.head</code> voor alle velden van het geselecteerde blok en <code>ton.masterchainHead</code> voor het nieuwste masterchainblok van het netwerk. Stuur <code>{\"action\":\"select\",\"workchain\":-1}</code> om een open verbinding naar de masterchain te schakelen.</p>"
  ],
  "websocket-ping": [
    "Verbinding actief houden",
    "<p>Stuur een ping om de verbinding te controleren. Stuur na opnieuw verbinden <code>init</code> opnieuw om de huidige momentopname op te halen.</p>"
  ],
  "websocket-stale": [
    "Vertraagde updates",
    "<p>Als <code>ton.stale</code> true is, behoud dan de laatst beschikbare blokken en markeer ze als vertraagd. <code>ton.observedAt</code> is het waarnemingstijdstip. Alleen een gezonde WebSocket-verbinding bewijst niet dat de gegevens actueel zijn.</p>"
  ]
};
export function translateTonDocsDutch(items: TonDocItem[], locale: string): TonDocItem[] {
  if (!locale.toLowerCase().startsWith('nl')) return items;
  return items.map(item => {
    if (item.type === 'category') return { ...item, title: categories[item.title] || item.title };
    const translated = entries[item.fragment];
    return { ...item, title: translated?.[0] || item.title, description: translated?.[1] || item.description, category: categories[item.category] || item.category };
  });
}
