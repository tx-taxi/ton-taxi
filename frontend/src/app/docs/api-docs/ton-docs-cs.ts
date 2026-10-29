import { TonDocItem } from './ton-docs-data';

// Source-fingerprinted translations; endpoints and examples remain unchanged.
const categories: Record<string, string> = {
  "TON basics": "Základy TON",
  "Wallets and contracts": "Peněženky a kontrakty",
  "Jettons and NFTs": "Jettony a NFT",
  "Using tx.taxi": "Používání tx.taxi",
  "Conventions": "Konvence",
  "Network and blocks": "Síť a bloky",
  "Transactions and messages": "Transakce a zprávy",
  "Accounts and contracts": "Účty a kontrakty",
  "NFTs and jettons": "NFT a jettony",
  "Live block updates": "Živé aktualizace bloků",
  "Network": "Síť",
  "Transactions": "Transakce",
  "Accounts": "Účty",
  "Contracts": "Kontrakty",
  "Jettons": "Jettony",
  "NFTs": "NFT",
  "Collectibles": "Sběratelské předměty",
  "Assets": "Aktiva",
  "Search": "Vyhledávání",
  "Live data": "Živá data",
  "Support": "Podpora",
  "Reference": "Reference",
  "Blocks": "Bloky",
  "Messages": "Zprávy",
  "Connection": "Připojení",
  "State": "Stav"
};
const entries: Record<string, [string, string]> = {
  "masterchain-and-shards": [
    "Co znamenají bloky masterchainu a shardů?",
    "<p>Masterchain uchovává globální konfiguraci a odkazy na stavy shardchainů. Většina uživatelských účtů je v basechainu, který lze rozdělit na shardy. Blok společně určuje workchain, shard a pořadové číslo; samotné pořadové číslo není výškou bloku v celé síti.</p><p>Horní pás zobrazuje bloky basechainu. Chcete-li zobrazit bloky masterchainu, otevřete nabídku vyhledávání a v části VYBRÁNO zvolte Masterchain. Je-li aktivních více shardů, vyberte požadovaný shard. Otevřením bloku zobrazíte jeho transakce; bloky masterchainu odkazují také na příslušné shardy.</p>"
  ],
  "transactions-and-messages": [
    "Jak spolu souvisejí transakce, zprávy a stopy?",
    "<p>Transakce zaznamenává zpracování zprávy nebo systémové operace jedním účtem. Zprávy propojují účty; zpracování příchozí zprávy může vytvořit odchozí zprávy a další transakce. Stopa sleduje tyto navazující transakce.</p><p>Stránku transakce použijte pro místní provedení, zprávy pro převody mezi kontrakty a stopu pro širší operaci. <a href=\"https://docs.ton.org/start-here\" target=\"_blank\" rel=\"noopener noreferrer\">Základy TON</a>.</p>"
  ],
  "logical-time": [
    "Co je logický čas?",
    "<p>Logický čas (LT) určuje pořadí transakcí a zpráv. Liší se od unixového časového údaje zobrazeného jako datum transakce. Historie účtu používá LT jako kurzor stránkování; zachovejte jej jako přesný řetězec celého čísla.</p>"
  ],
  "fees-and-phases": [
    "Kam se poděl poplatek?",
    "<p>Provedení může zahrnovat fáze úložiště, připsání, výpočtu, akce a vrácení zprávy. Stránka transakce ukazuje celkové poplatky a zaznamenané podrobnosti jednotlivých fází včetně spotřeby gasu, nákladů na předání a návratových kódů. I neúspěšná operace může zaplatit poplatky.</p><p>GRAM je nativní měnou sítě TON a používá 9 desetinných míst: 1 GRAM = 1 000 000 000 nanogramů. Hodnota zprávy a poplatek za transakci označují různé částky.</p>"
  ],
  "bounce-and-failure": [
    "Co znamená vrácená zpráva nebo neúspěšná transakce?",
    "<p>Vrácená zpráva odešle odpověď, když zprávu s možností vrácení nelze podle příslušných pravidel zpracovat. Jde o samostatnou zprávu s vlastní hodnotou a náklady. Zkontrolujte společně výsledek transakce, výsledky výpočtu a akcí i odchozí zprávy.</p><p>Potvrzená transakce může mít neúspěšné provedení. Jedna úspěšná transakce také nedokazuje, že uspěly všechny pozdější transakce v její stopě. <a href=\"https://docs.ton.org/resources/pdfs/tblkch.pdf\" target=\"_blank\" rel=\"noopener noreferrer\">Specifikace blockchainu TON</a>.</p>"
  ],
  "confirmation": [
    "Znamená potvrzení dokončení celé operace?",
    "<p>Potvrzení znamená, že transakce byla zahrnuta do svého bloku. Operace zahrnující více kontraktů může obsahovat další transakce a zprávy. Zkontrolujte celou stopu a konečného příjemce; první transakci nepovažujte za celý převod.</p>"
  ],
  "wallets-and-state": [
    "Co zobrazuje stránka účtu?",
    "<p>Účty zobrazují zůstatek GRAM, stav, poslední aktivitu a rozpoznaná rozhraní kontraktu. Historie seskupuje rozpoznané akce; Transakce vypisují transakce účtu. Jettony a NFT mají vlastní karty.</p><p>Karta Kontrakt obsahuje stav, kód a data, metody jen pro čtení a dostupné záznamy o stakingu, multisigu, předplatném a DeFi. Rozbalte podrobnosti účtu pro další pole a dodatečné měny.</p>"
  ],
  "addresses-and-dns": [
    "Proč může mít stejný účet různé adresy?",
    "<p>Účty TON lze zapsat jako surový workchain a šestnáctkové ID účtu nebo jako uživatelsky přívětivou adresu. Příznaky možnosti vrácení zprávy a sítě mohou změnit podobu přívětivé adresy, aniž by změnily samotný účet.</p><p>Vyhledávání přijímá adresy TON a názvy .ton. Překlad DNS odkazuje na příslušný účet; název domény nenahrazuje kontrolu adresy účtu.</p>"
  ],
  "contract-methods": [
    "Mohu číst data smart kontraktu?",
    "<p>Na kartě Kontrakt vyberte uvedený getter a podle potřeby zadejte jeho argumenty. Čtení vrátí výsledek bez podepsání transakce. Argumenty mohou být řetězce oddělené čárkami nebo pole řetězců JSON; velká celá čísla zachovejte jako řetězce.</p><p>Podrobnosti účtu zachovávají pole kódu, dat a úložiště. Inspekce zobrazuje rozpoznaná rozhraní a dostupné informace o kompilátoru.</p>"
  ],
  "validators": [
    "Co zobrazuje stránka validátorů?",
    "<p>Stránka validátorů zobrazuje časy voleb, celkový a minimální stake a účty, staky a adresy ADNL zúčastněných validátorů. Tyto údaje popisují zobrazená volební data; adresa se stakem nemusí být automaticky tvůrcem konkrétního bloku.</p>"
  ],
  "jettons": [
    "Jak fungují jettony?",
    "<p>Jetton má hlavní kontrakt a jednotlivé kontrakty jettonových peněženek držitelů. Určujte jej podle adresy hlavního kontraktu, nikoli názvu nebo symbolu. Stránka jettonu zobrazuje nabídku, desetinná místa, správu a držitele.</p><p>Zůstatky zobrazujte podle vlastního počtu desetinných míst jettonu. Nepředpokládejte, že každý jetton má 9 desetinných míst. <a href=\"https://docs.ton.org/contracts/standard/tokens/jettons/overview\" target=\"_blank\" rel=\"noopener noreferrer\">Standard jettonů</a>.</p>"
  ],
  "scaled-jettons": [
    "Proč se zobrazený zůstatek jettonu může lišit od částky na blockchainu?",
    "<p>Některé jettony používají násobitel pro zobrazení. Aktuální zůstatky peněženek a držitelů i celková nabídka používají tento poměr s přesným zaokrouhlením a následně desetinná místa tokenu. Rozbalte podrobnosti částky a zobrazte částku na blockchainu, surové jednotky a poměr.</p><p>Historické převody zachovávají zaznamenané množství na blockchainu; současný násobitel nedokazuje, jaký násobitel platil tehdy. <a href=\"https://github.com/ton-blockchain/TEPs/blob/master/text/0526-scaled-ui-jettons.md\" target=\"_blank\" rel=\"noopener noreferrer\">Standard škálovaného zobrazení jettonů</a>.</p>"
  ],
  "nft-identity": [
    "Co identifikuje NFT?",
    "<p>Identitou položky NFT je adresa jejího kontraktu. Kolekce, vlastník a index položky jsou samostatná pole. Ověření příslušnosti ke kolekci kontroluje vztah položky ke kolekci; nepotvrzuje důvěryhodnost jejího obrázku, názvu nebo prodejce.</p><p>Podrobnosti položky zobrazují přesný index, pokud jej potvrdí kontrakt NFT. Číslo uvedené v názvu NFT nemusí odpovídat jeho indexu na blockchainu.</p>"
  ],
  "nft-metadata": [
    "Odkud pocházejí obrázky a atributy?",
    "<p>TEP-64 podporuje metadata na blockchainu, mimo něj i jejich kombinaci. Stránka NFT zobrazuje názvy, popisy, obrázky a atributy a umožňuje rozbalit úplná metadata. Média nebo metadata hostovaná jinde se mohou změnit nebo stát nedostupnými.</p><p>Animace otevírejte přímo na stránce položky. Chybějící médium nemaže kontrakt NFT ani záznam o vlastnictví. <a href=\"https://github.com/ton-blockchain/TEPs/blob/master/text/0064-token-data-standard.md\" target=\"_blank\" rel=\"noopener noreferrer\">Standard metadat tokenů</a>.</p>"
  ],
  "nft-sales": [
    "Proč NFT vlastní prodejní kontrakt?",
    "<p>Nabízené NFT může držet prodejní kontrakt tržiště. Seznamy NFT v peněžence zahrnují rozpoznané nepřímé vlastnictví prostřednictvím prodeje. Stránka položky odděleně zobrazuje vlastníka na blockchainu, prodejce, prodejní kontrakt a měnu ceny.</p><p>Prodejní nabídka není dokončený převod. Změny sledujte v historii převodů a položky procházejte na stránce kolekce.</p>"
  ],
  "telegram-collectibles": [
    "Jsou všechny dárky Telegramu viditelné na blockchainu?",
    "<p>Ne. Aby dárek měl zde uvedenou adresu položky a záznam o vlastnictví na blockchainu, musí existovat jako NFT sítě TON. S dárky Telegramu, sběratelskými uživatelskými jmény a čísly mohou být spojena NFT sítě TON, ale samotný profil Telegramu nebo běžné uživatelské jméno nedokazuje vlastnictví peněženky.</p><p>Sběratelská položka může být zobrazena na profilu Telegramu, zatímco jejím vlastníkem zůstává peněženka TON. Zkontrolujte adresu položky, kolekci a aktuálního vlastníka. <a href=\"https://core.telegram.org/api/gifts\" target=\"_blank\" rel=\"noopener noreferrer\">Sběratelské dárky Telegramu</a>.</p>"
  ],
  "nft-pagination": [
    "Jak zobrazím všechna NFT v účtu nebo kolekci?",
    "<p>Pomocí tlačítka Načíst další pod seznamem NFT pokračujte v procházení kolekce nebo peněženky. Karta NFT obsahuje každou vrácenou položku samostatně s úplným názvem a odkazem na podrobnosti. Sbírka NFT v peněžence a její historie transakcí jsou nezávislé seznamy.</p>"
  ],
  "trust-and-identity": [
    "Co znamenají štítky rozpoznání?",
    "<p>Příslušnost ke kolekci, klasifikace důvěryhodnosti a schválení tržišť jsou odlišné skutečnosti. Rozpoznané názvy a obrázky nejsou důkazem vlastnictví. Než začnete dvě podobně pojmenovaná aktiva považovat za stejný token, porovnejte adresy kontraktů a odkazy na kolekce.</p>"
  ],
  "automatic-routing": [
    "Jak funguje automatické směrování?",
    "<p>Do vyhledávání vložte adresu, hash transakce, hash zprávy, číslo bloku nebo název .ton. Automatické směrování umožní taxi najít příslušný řetězec. Výběrem nativního průzkumníka zůstane dostupné vyhledávání daného řetězce; tlačítko Zobrazit rozcestník vrací na tx.taxi.</p>"
  ],
  "updates": [
    "Co znamená zpoždění aktualizací?",
    "<p>Při zpoždění nových aktualizací zůstanou poslední dostupná data viditelná. Nedostupnou sekci můžete zkusit načíst znovu. Prázdný seznam a nedostupný seznam jsou dva různé stavy.</p>"
  ],
  "wallet-support": [
    "Může tx.taxi vrátit transakci?",
    "<p>tx.taxi zobrazuje veřejná data blockchainu. Nemůže podepisovat transakce, přistupovat k soukromým klíčům ani vracet převody. Pro podporu peněženky nebo účtu na burze kontaktujte službu, která operaci odeslala.</p>"
  ],
  "api-values": [
    "Hodnoty a stránkování",
    "<p>Všechny následující cesty používají GET. Celá čísla citlivá na přesnost jsou desetinné řetězce; zpracovávejte je aritmetikou s libovolnou přesností. Zůstatky a poplatky GRAM jsou v nanogramech. Částky jettonů používají deklarovaný počet desetinných míst.</p><p>Stránkované odpovědi obsahují <code>_paging</code>. Pokračujte pouze tehdy, když je <code>hasMore</code> pravda, a pro příslušný endpoint použijte <code>nextOffset</code>, <code>nextBeforeLt</code> nebo <code>nextBefore</code>. Limit seznamů je omezen na 100; seznamy bloků na 16.</p><p><code>_meta.observedAt</code> určuje čas pozorování a <code>_meta.stale</code> označuje uchovaná data. HTTP 400 znamená neplatný vstup, 404 nenalezeno a 503 dočasnou nedostupnost.</p>"
  ],
  "get-dashboard": [
    "Přehled sítě",
    "<p>Vrací vybraný workchain a shard, nedávné bloky, pozorovanou historii, čas pozorování a stav zastarání. Výchozí je basechain. Pro masterchain použijte <code>workchain=-1</code> nebo pro aktivní shard basechainu <code>workchain=0&amp;shard=...</code>. <code>activeShards</code> vypisuje dostupné shardy; <code>masterchainHead</code> je aktuální hlava masterchainu sítě.</p>"
  ],
  "get-blocks": [
    "Bloky",
    "<p>Vrací bloky z jednoho workchainu a shardu v sestupném pořadí čísel. Výchozí je basechain; pro bloky masterchainu použijte <code>workchain=-1</code>. Pokračujte pomocí <code>before=_paging.nextBefore</code> a zachovejte <code>workchain</code> a <code>shard</code> z odpovědi; hranice je výlučná. Stránkování se zastaví při rozdělení nebo sloučení shardu.</p>"
  ],
  "get-block": [
    "Podrobnosti bloku",
    "<p>Použijte pořadové číslo nebo úplný identifikátor <code>(workchain,shard,seqno)</code>. Pořadové číslo používá vybraný workchain a shard; bez výběru používá výchozí workchain hostitele a kořenový shard. Vrací hashe, časové značky, logické časy, reference a pole toku hodnot.</p>"
  ],
  "get-block-transactions": [
    "Transakce bloku",
    "<p>Vrací transakce zahrnuté ve zvoleném bloku.</p>"
  ],
  "get-block-shards": [
    "Odkazy na shardy masterchainu",
    "<p>Použijte pořadové číslo masterchainu nebo identifikátor bloku masterchainu. Vrací odpovídající odkazy na shardy.</p>"
  ],
  "get-network-transactions": [
    "Transakce sítě",
    "<p>Vrací transakce napříč shardy v jednom intervalu masterchainu. V rámci tohoto intervalu pokračujte pomocí <code>master_seqno=_paging.masterSeqno</code> a <code>offset=_paging.nextOffset</code>. Pokud je <code>nextOffset</code> null, pokračujte místo toho pomocí <code>before=_paging.nextBefore</code>. Limity jsou omezeny na 50.</p>"
  ],
  "get-transactions": [
    "Transakce masterchainu",
    "<p>Vrací transakce z jednoho bloku masterchainu. Pokračujte pomocí <code>before=_paging.nextBefore</code>. Jde o transakce masterchainu, nikoli o všechny transakce napříč všemi shardy.</p>"
  ],
  "get-validators": [
    "Validátoři",
    "<p>Vrací informace o volbě validátorů, částky staků a záznamy validátorů.</p>"
  ],
  "get-dns": [
    "Podrobnosti domény",
    "<p>Identita domény, datum vypršení a propojené NFT. Připojte <code>/resolve</code> pro záznamy peněženky, webu, úložiště a resolveru nebo <code>/bids</code> pro historii nabídek.</p>"
  ],
  "get-auctions": [
    "Aukce DNS",
    "<p>Aktuální aukce domén. Vyberte <code>ton</code> nebo <code>t.me</code>.</p>"
  ],
  "get-dns-expiring": [
    "Domény před vypršením",
    "<p>Vrací domény blížící se vypršení. Volitelný parametr <code>period</code> určuje počet dní před vypršením.</p>"
  ],
  "get-staking-pool": [
    "Stakingový pool",
    "<p>Stake poolu, nominátoři, cyklus, implementace a roční procentní výnos. Připojte <code>/history</code> pro pozorovanou historii APY.</p>"
  ],
  "get-extra-currency": [
    "Doplňková měna",
    "<p>ID měny, symbol, desetinná místa a obrázek.</p>"
  ],
  "get-extra-currency-history": [
    "Historie doplňkové měny",
    "<p>Události účtu pro vybranou měnu. Pokračujte pomocí <code>before_lt</code>.</p>"
  ],
  "get-block-boc": [
    "BOC bloku",
    "<p>Stáhne blok jako binární Bag of Cells.</p>"
  ],
  "get-config-raw": [
    "Surová konfigurace",
    "<p>Surová konfigurace sítě. Přidejte <code>master_seqno</code> pro vyžádání historické konfigurace masterchainu.</p>"
  ],
  "get-config": [
    "Konfigurace blockchainu",
    "<p>Vrací dekódované parametry konfigurace blockchainu. Přidejte <code>master_seqno</code> pro historickou konfiguraci masterchainu.</p>"
  ],
  "get-rates": [
    "Směnné kurzy GRAM",
    "<p>Vrací kurzy GRAM v AUD, CAD, CHF, EUR, GBP, JPY a USD.</p>"
  ],
  "get-transaction": [
    "Podrobnosti transakce",
    "<p>Vrací transakci účtu, zprávy, poplatky, fáze a změny stavu a také dostupnou stopu a podrobnosti interpretované události. <code>relatedUnavailable</code> označuje související části, které se nepodařilo načíst.</p>"
  ],
  "get-message": [
    "Transakce podle hashe zprávy",
    "<p>Vyhledá transakci přiřazenou k zadanému hashi zprávy.</p>"
  ],
  "get-trace": [
    "Stopa",
    "<p>Vrací strom souvisejících transakcí s podřízenými stopami a podrobnostmi provedení.</p>"
  ],
  "resolve": [
    "Rozpoznání vyhledávaného vstupu",
    "<p>Rozpozná účet TON, NFT, kolekci, jetton, transakci, hash zprávy, identifikátor bloku nebo doménu .ton. Vrací typ a identifikátor objektu.</p>"
  ],
  "get-account": [
    "Podrobnosti účtu",
    "<p>Vrací zůstatek, stav, rozhraní kontraktu, dostupný stav blockchainu a názvy DNS. Stav může obsahovat kód, data, informace o úložišti a doplňkové měny.</p>"
  ],
  "get-account-transactions": [
    "Transakce účtu",
    "<p>Vypisuje transakce účtu. Pokračujte pomocí <code>before_lt=_paging.nextBeforeLt</code>; přijímá se také <code>after_lt</code>.</p>"
  ],
  "get-account-events": [
    "Převody a události účtu",
    "<p>Vrací interpretované akce a jejich stavy. Pokračujte pomocí <code>before_lt</code>.</p>"
  ],
  "get-account-jettons": [
    "Zůstatky jettonů",
    "<p>Vrací zůstatky s metadaty hlavního kontraktu a adresami jettonových peněženek účtu.</p>"
  ],
  "get-account-nfts": [
    "NFT účtu",
    "<p>Vrací položky NFT, ve výchozím nastavení včetně rozpoznaného nepřímého vlastnictví prostřednictvím prodeje. Filtrujte pomocí <code>collection</code> nebo použijte <code>indirect_ownership=false</code> pouze pro přímé vlastnictví. Pokračujte pomocí <code>offset=_paging.nextOffset</code>.</p>"
  ],
  "get-account-nft-history": [
    "Operace NFT",
    "<p>Vrací operace NFT účtu. Pokračujte pomocí <code>before_lt</code>.</p>"
  ],
  "get-account-jetton-history": [
    "Historie jettonů",
    "<p>Vrací události jettonů účtu. Pokračujte pomocí <code>before_lt</code>.</p>"
  ],
  "get-inspect": [
    "Inspekce kontraktu",
    "<p>Vrací dostupné podrobnosti inspekce kontraktu a rozpoznaná rozhraní.</p>"
  ],
  "get-method": [
    "Čtení metody kontraktu",
    "<p>Spustí getter jen pro čtení. Každý argument zadejte opakovaným parametrem <code>args</code>, například <code>?args=123&args=456</code>. Argumenty zůstávají řetězci a mohou obsahovat celočíselné hodnoty, adresy nebo BOC přijímané metodou.</p>"
  ],
  "get-staking": [
    "Stakingové pooly",
    "<p>Vrací pozice účtu v nominačních poolech.</p>"
  ],
  "get-multisig": [
    "Multisig kontrakt",
    "<p>Vrací práh, podepisující, navrhovatele, pořadové číslo a příkazy multisig kontraktu. Pomocí množné cesty níže vyhledejte multisigy spojené s peněženkou podepisujícího.</p>"
  ],
  "get-multisigs": [
    "Záznamy multisigu",
    "<p>Vrací záznamy multisigu spojené s účtem.</p>"
  ],
  "get-subscriptions": [
    "Předplatná",
    "<p>Vrací záznamy předplatného účtu.</p>"
  ],
  "get-defi": [
    "Aktiva DeFi",
    "<p>Vrací rozpoznané pozice a aktiva DeFi účtu.</p>"
  ],
  "get-nft": [
    "Položka NFT",
    "<p>Vrací vlastníka položky, kolekci, metadata, náhledy médií, důvěryhodnost a prodejní pole. <code>indexVerified</code> označuje, zda byl <code>index</code> potvrzen pomocí <code>get_nft_data</code>; původní index zůstává v <code>indexed_index</code>.</p>"
  ],
  "get-sbt": [
    "Podrobnosti nepřenosného NFT",
    "<p>U nepřenosného NFT vrací z jeho kontraktu adresu oprávněné osoby a čas odvolání. Nulový čas odvolání znamená, že nebylo odvoláno. Tyto položky nelze převádět.</p>"
  ],
  "get-nft-history": [
    "Historie NFT",
    "<p>Vrací události jednotlivého NFT. Pokračujte pomocí <code>before_lt</code>.</p>"
  ],
  "get-collection": [
    "Podrobnosti kolekce",
    "<p>Vrací vlastníka kolekce, obsah, metadata a náhledy. Pokud je <code>indexVerified</code> pravda, <code>next_item_index</code> je potvrzen getterem kolekce; nemusí jít o celkový počet položek.</p>"
  ],
  "get-collection-items": [
    "Položky kolekce",
    "<p>Vrací položky NFT z kolekce. Pokračujte pomocí <code>offset=_paging.nextOffset</code>.</p>"
  ],
  "get-jetton": [
    "Podrobnosti jettonu",
    "<p>Vrací metadata hlavního kontraktu, celkovou nabídku, správu, desetinná místa a počet držitelů.</p>"
  ],
  "get-jetton-holders": [
    "Držitelé jettonu",
    "<p>Vrací záznamy držitelů pod <code>addresses</code>. Pokračujte pomocí <code>offset=_paging.nextOffset</code>. Hodnoty zůstatků používají desetinná místa jettonu.</p>"
  ],
  "websocket-connect": [
    "Připojení",
    "<p>Připojte se ke stejnému hostiteli na <code>/api/v1/ws</code> a odešlete <code>init</code> pro aktuální snímek. Ve výchozím nastavení jsou vybrány bloky basechainu. Přidejte <code>?workchain=-1</code> pro masterchain nebo <code>?workchain=0&amp;shard=...</code> pro shard basechainu. Pro jednotlivé účty, NFT, transakce a stopy použijte REST API.</p>"
  ],
  "websocket-init": [
    "Aktuální snímek",
    "<p>Odpověď obsahuje nedávné normalizované <code>blocks</code> vybraného workchainu a shardu a objekt <code>ton</code> s hlavou, pozorovanou historií, časem pozorování a stavem zastarání. Pro úplná pole vybraného bloku použijte <code>ton.head</code> a pro hlavu masterchainu sítě <code>ton.masterchainHead</code>. Odesláním <code>{\"action\":\"select\",\"workchain\":-1}</code> přepnete otevřené spojení na masterchain.</p>"
  ],
  "websocket-ping": [
    "Udržování aktivního spojení",
    "<p>Odesláním pingu zkontrolujte spojení. Po opětovném připojení znovu odešlete <code>init</code> pro získání aktuálního snímku.</p>"
  ],
  "websocket-stale": [
    "Zpožděné aktualizace",
    "<p>Když je <code>ton.stale</code> pravda, zachovejte poslední dostupné bloky a označte je jako zpožděné. <code>ton.observedAt</code> je čas pozorování. Samotný stav spojení WebSocket nedokazuje aktuálnost dat.</p>"
  ]
};
export function translateTonDocsCzech(items: TonDocItem[], locale: string): TonDocItem[] {
  if (!locale.toLowerCase().startsWith('cs')) return items;
  return items.map(item => {
    if (item.type === 'category') return { ...item, title: categories[item.title] || item.title };
    const translated = entries[item.fragment];
    return { ...item, title: translated?.[0] || item.title, description: translated?.[1] || item.description, category: categories[item.category] || item.category };
  });
}
