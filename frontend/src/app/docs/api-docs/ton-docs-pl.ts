import { TonDocItem } from './ton-docs-data';

// Source-fingerprinted translations; endpoints and examples remain unchanged.
const categories: Record<string, string> = {
  "TON basics": "Podstawy TON",
  "Wallets and contracts": "Portfele i kontrakty",
  "Jettons and NFTs": "Jettony i NFT",
  "Using tx.taxi": "Korzystanie z tx.taxi",
  "Conventions": "Konwencje",
  "Network and blocks": "Sieć i bloki",
  "Transactions and messages": "Transakcje i wiadomości",
  "Accounts and contracts": "Konta i kontrakty",
  "NFTs and jettons": "NFT i jettony",
  "Live block updates": "Aktualizacje bloków na żywo",
  "Network": "Sieć",
  "Transactions": "Transakcje",
  "Accounts": "Konta",
  "Contracts": "Kontrakty",
  "Jettons": "Jettony",
  "NFTs": "NFT",
  "Collectibles": "Przedmioty kolekcjonerskie",
  "Assets": "Aktywa",
  "Search": "Wyszukiwanie",
  "Live data": "Dane na żywo",
  "Support": "Pomoc",
  "Reference": "Dokumentacja",
  "Blocks": "Bloki",
  "Messages": "Wiadomości",
  "Connection": "Połączenie",
  "State": "Stan"
};
const entries: Record<string, [string, string]> = {
  "masterchain-and-shards": [
    "Co oznaczają bloki masterchain i shardów?",
    "<p>Masterchain przechowuje konfigurację globalną i odwołania do stanów shardchainów. Większość kont użytkowników znajduje się w basechain, który może być podzielony na shardy. Blok identyfikują łącznie jego workchain, shard i numer sekwencyjny; sam numer sekwencyjny nie jest wysokością bloku w całej sieci.</p><p>Górny pasek pokazuje bloki basechain. Otwórz menu wyszukiwania i wybierz Masterchain w sekcji WYBRANO, aby zobaczyć bloki masterchain. Gdy aktywnych jest kilka shardów, wybierz jeden. Otwórz blok, aby sprawdzić jego transakcje; bloki masterchain zawierają również linki do shardów, do których się odwołują.</p>"
  ],
  "transactions-and-messages": [
    "Jak powiązane są transakcje, wiadomości i ślady?",
    "<p>Transakcja zapisuje przetworzenie wiadomości lub operacji systemowej przez jedno konto. Wiadomości łączą konta; przetworzenie wiadomości przychodzącej może utworzyć wiadomości wychodzące i kolejne transakcje. Ślad przedstawia te powiązane transakcje.</p><p>Użyj strony transakcji do sprawdzenia lokalnego wykonania, wiadomości do transferów między kontraktami, a śladu do prześledzenia całej operacji. <a href=\"https://docs.ton.org/start-here\" target=\"_blank\" rel=\"noopener noreferrer\">Podstawy TON</a>.</p>"
  ],
  "logical-time": [
    "Czym jest czas logiczny?",
    "<p>Czas logiczny (LT) porządkuje transakcje i wiadomości. Jest niezależny od znacznika czasu Unix wyświetlanego jako data transakcji. Historia konta używa LT jako kursora stronicowania; zachowaj go jako dokładny ciąg liczby całkowitej.</p>"
  ],
  "fees-and-phases": [
    "Co składa się na opłatę?",
    "<p>Wykonanie może obejmować fazy przechowywania, uznania, obliczeń, działań i odbicia. Strona transakcji pokazuje łączne opłaty oraz zapisane szczegóły faz, w tym zużycie gazu, koszty przekazania i kody wyjścia. Nieudana operacja nadal może wiązać się z opłatami.</p><p>GRAM jest natywną walutą TON i ma 9 miejsc dziesiętnych: 1 GRAM = 1 000 000 000 nanogramów. Wartość wiadomości i opłata transakcyjna oznaczają różne kwoty.</p>"
  ],
  "bounce-and-failure": [
    "Co oznacza odbita wiadomość lub nieudana transakcja?",
    "<p>Odbita wiadomość zwraca odpowiedź, gdy wiadomość z możliwością odbicia nie może zostać przetworzona zgodnie z odpowiednimi zasadami. Jest to osobna wiadomość z własną wartością i kosztami. Sprawdź łącznie wynik transakcji, wyniki obliczeń i działań oraz wiadomości wychodzące.</p><p>Potwierdzona transakcja może zakończyć się błędem wykonania. Jedna pomyślna transakcja nie dowodzi też, że wszystkie późniejsze transakcje w jej śladzie się powiodły. <a href=\"https://docs.ton.org/resources/pdfs/tblkch.pdf\" target=\"_blank\" rel=\"noopener noreferrer\">Specyfikacja blockchain TON</a>.</p>"
  ],
  "confirmation": [
    "Czy potwierdzenie oznacza zakończenie całej operacji?",
    "<p>Potwierdzenie oznacza włączenie transakcji do jej bloku. Operacja obejmująca wiele kontraktów może wymagać kolejnych transakcji i wiadomości. Sprawdź cały ślad i końcowego odbiorcę, zamiast uznawać pierwszą transakcję za cały transfer.</p>"
  ],
  "wallets-and-state": [
    "Co pokazuje strona konta?",
    "<p>Konta pokazują saldo GRAM, stan, ostatnią aktywność i wykryte interfejsy kontraktów. Historia grupuje rozpoznane działania; Transakcje zawierają listę transakcji konta. Jettony i NFT mają osobne karty.</p><p>Karta Kontrakt zawiera stan, kod i dane, metody tylko do odczytu oraz dostępne rekordy stakingu, portfeli wielopodpisowych, subskrypcji i DeFi. Rozwiń Szczegóły konta, aby zobaczyć dodatkowe pola i waluty.</p>"
  ],
  "addresses-and-dns": [
    "Dlaczego to samo konto może mieć różne adresy?",
    "<p>Konta TON można zapisać jako surowy workchain i szesnastkowy identyfikator konta albo w postaci przyjaznego adresu. Flagi odbijalności i sieci mogą zmieniać przyjazną reprezentację bez zmiany samego konta.</p><p>Wyszukiwarka przyjmuje adresy TON i nazwy .ton. Rozwiązanie DNS prowadzi do odpowiedniego konta; nazwa domeny nie zastępuje sprawdzenia adresu konta.</p>"
  ],
  "contract-methods": [
    "Czy mogę odczytać inteligentny kontrakt?",
    "<p>Wybierz wymienioną metodę odczytu na karcie Kontrakt i w razie potrzeby podaj jej argumenty. Odczyt zwraca wynik bez podpisywania transakcji. Argumenty mogą być ciągami oddzielonymi przecinkami lub tablicą ciągów JSON; duże liczby całkowite zachowuj jako ciągi.</p><p>Szczegóły konta zachowują pola kodu, danych i przechowywania. Inspekcja pokazuje rozpoznane interfejsy i dostępne informacje o kompilatorze.</p>"
  ],
  "validators": [
    "Co pokazuje strona walidatorów?",
    "<p>Strona walidatorów pokazuje czasy wyborów, łączny i minimalny stake oraz uczestniczące konta walidatorów, ich stake i adresy ADNL. Pola opisują wyświetlane dane wyborów; adres ze stake’em nie musi być producentem konkretnego bloku.</p>"
  ],
  "jettons": [
    "Jak działają jettony?",
    "<p>Jetton ma kontrakt główny oraz indywidualne kontrakty portfeli jettonów dla posiadaczy. Identyfikuj go po adresie kontraktu głównego, a nie nazwie lub symbolu. Strona jettona pokazuje podaż, liczbę miejsc dziesiętnych, administrację i posiadaczy.</p><p>Wyświetlaj salda z użyciem liczby miejsc dziesiętnych danego jettona. Nie zakładaj, że każdy jetton ma 9 miejsc dziesiętnych. <a href=\"https://docs.ton.org/contracts/standard/tokens/jettons/overview\" target=\"_blank\" rel=\"noopener noreferrer\">Standard jettonów</a>.</p>"
  ],
  "scaled-jettons": [
    "Dlaczego wyświetlane saldo jettona może różnić się od kwoty w łańcuchu?",
    "<p>Niektóre jettony używają mnożnika wyświetlania. Bieżące salda portfeli, salda posiadaczy i łączna podaż stosują ten współczynnik z dokładnym zaokrągleniem, a następnie liczbę miejsc dziesiętnych tokena. Rozwiń Szczegóły kwoty, aby zobaczyć kwotę w łańcuchu, jednostki surowe i współczynnik.</p><p>Historyczne transfery zachowują zapisaną ilość w łańcuchu; bieżący mnożnik nie dowodzi, jaki mnożnik obowiązywał w tamtym czasie. <a href=\"https://github.com/ton-blockchain/TEPs/blob/master/text/0526-scaled-ui-jettons.md\" target=\"_blank\" rel=\"noopener noreferrer\">Standard skalowania wyświetlania jettonów</a>.</p>"
  ],
  "nft-identity": [
    "Co identyfikuje NFT?",
    "<p>Tożsamością przedmiotu NFT jest adres jego kontraktu. Kolekcja, właściciel i indeks przedmiotu są osobnymi polami. Weryfikacja przynależności do kolekcji sprawdza związek przedmiotu z kolekcją; nie potwierdza wiarygodności jego obrazu, nazwy ani sprzedawcy.</p><p>Szczegóły przedmiotu pokazują dokładny indeks, gdy potwierdzi go kontrakt NFT. Numer wyświetlany w nazwie NFT nie musi być równy jego indeksowi w łańcuchu.</p>"
  ],
  "nft-metadata": [
    "Skąd pochodzą obrazy i atrybuty?",
    "<p>TEP-64 obsługuje metadane w łańcuchu, poza łańcuchem i łączone. Strona NFT wyświetla nazwy, opisy, obrazy i atrybuty, a pełne metadane można rozwinąć. Media lub metadane przechowywane gdzie indziej mogą się zmienić lub stać się niedostępne.</p><p>Animacje otwieraj bezpośrednio ze strony przedmiotu. Brak mediów nie usuwa kontraktu NFT ani zapisu własności. <a href=\"https://github.com/ton-blockchain/TEPs/blob/master/text/0064-token-data-standard.md\" target=\"_blank\" rel=\"noopener noreferrer\">Standard metadanych tokenów</a>.</p>"
  ],
  "nft-sales": [
    "Dlaczego właścicielem NFT jest kontrakt sprzedaży?",
    "<p>Wystawione NFT może być przechowywane przez kontrakt sprzedaży platformy handlowej. Listy NFT portfela obejmują rozpoznaną pośrednią własność przez sprzedaż. Strona przedmiotu oddziela właściciela w łańcuchu, sprzedawcę, kontrakt sprzedaży i walutę ceny.</p><p>Wystawienie na sprzedaż nie jest zakończonym transferem. Użyj historii transferów do śledzenia zmian i strony kolekcji do przeglądania jej przedmiotów.</p>"
  ],
  "telegram-collectibles": [
    "Czy wszystkie prezenty Telegrama są widoczne w łańcuchu?",
    "<p>Nie. Prezent musi istnieć jako NFT TON, aby miał tutaj adres przedmiotu i zapis własności w łańcuchu. Prezenty Telegrama oraz kolekcjonerskie nazwy użytkowników i numery mogą mieć powiązane NFT TON, ale sam profil Telegrama lub zwykła nazwa użytkownika nie dowodzi własności portfela.</p><p>Przedmiot kolekcjonerski może być wyświetlany w profilu Telegrama, podczas gdy jego właścicielem pozostaje portfel TON. Sprawdź adres przedmiotu, kolekcję i bieżącego właściciela. <a href=\"https://core.telegram.org/api/gifts\" target=\"_blank\" rel=\"noopener noreferrer\">Prezenty kolekcjonerskie Telegrama</a>.</p>"
  ],
  "nft-pagination": [
    "Jak zobaczyć wszystkie NFT na koncie lub w kolekcji?",
    "<p>Użyj Wczytaj więcej pod listą NFT, aby kontynuować przeglądanie kolekcji lub portfela. Karta NFT pokazuje każdy zwrócony przedmiot osobno, z pełną nazwą i linkiem do szczegółów. Kolekcja NFT portfela i jego historia transakcji są niezależnymi listami.</p>"
  ],
  "trust-and-identity": [
    "Co oznaczają etykiety rozpoznania?",
    "<p>Przynależność do kolekcji, klasyfikacja wiarygodności i zatwierdzenia platform handlowych są odrębnymi faktami. Rozpoznane nazwy i obrazy nie są dowodami własności. Przed uznaniem dwóch podobnie nazwanych aktywów za ten sam token porównaj adresy kontraktów i linki do kolekcji.</p>"
  ],
  "automatic-routing": [
    "Jak działa automatyczne przekierowanie?",
    "<p>Wklej adres, hash transakcji, hash wiadomości, numer bloku lub nazwę .ton do wyszukiwarki. Automatyczne przekierowanie pozwala taksówce znaleźć odpowiedni łańcuch. Wybór natywnego eksploratora zachowuje wyszukiwanie tego łańcucha; Zobacz centrum prowadzi do tx.taxi.</p>"
  ],
  "updates": [
    "Co oznacza komunikat „Aktualizacje opóźnione”?",
    "<p>Ostatnie dostępne dane pozostają widoczne, gdy nowe aktualizacje są opóźnione. Ponów wczytywanie niedostępnej sekcji. Pusta lista i niedostępna lista to różne stany.</p>"
  ],
  "wallet-support": [
    "Czy tx.taxi może cofnąć transakcję?",
    "<p>tx.taxi wyświetla publiczne dane łańcucha. Nie może podpisywać transakcji, uzyskiwać dostępu do kluczy prywatnych ani cofać transferów. Aby uzyskać pomoc dotyczącą portfela lub konta giełdowego, skontaktuj się z usługą, która wysłała operację.</p>"
  ],
  "api-values": [
    "Wartości i stronicowanie",
    "<p>Wszystkie poniższe trasy używają GET. Liczby całkowite wymagające precyzji są ciągami dziesiętnymi; przetwarzaj je z dowolną precyzją. Salda i opłaty GRAM podawane są w nanogramach. Ilości jettonów używają zadeklarowanej liczby miejsc dziesiętnych.</p><p>Odpowiedzi stronicowane zawierają <code>_paging</code>. Kontynuuj tylko wtedy, gdy <code>hasMore</code> ma wartość true, używając <code>nextOffset</code>, <code>nextBeforeLt</code> lub <code>nextBefore</code> dla odpowiedniego punktu końcowego. Limity list są ograniczone do 100, a list bloków do 16.</p><p><code>_meta.observedAt</code> wskazuje czas obserwacji, a <code>_meta.stale</code> oznacza zachowane dane. HTTP 400 oznacza nieprawidłowe dane, 404 brak wyniku, a 503 tymczasową niedostępność.</p>"
  ],
  "get-dashboard": [
    "Przegląd sieci",
    "<p>Zwraca wybrany workchain i shard, ostatnie bloki, zaobserwowaną historię, czas obserwacji i stan nieaktualnych danych. Domyślny jest basechain. Użyj <code>workchain=-1</code> dla masterchain lub <code>workchain=0&amp;shard=...</code> dla aktywnego sharda basechain. <code>activeShards</code> wymienia dostępne shardy; <code>masterchainHead</code> to ostatni blok masterchain sieci.</p>"
  ],
  "get-blocks": [
    "Bloki",
    "<p>Zwraca bloki jednego workchaina i sharda w malejącej kolejności numerów sekwencyjnych. Domyślny jest basechain; użyj <code>workchain=-1</code> dla bloków masterchain. Kontynuuj za pomocą <code>before=_paging.nextBefore</code> i zachowaj <code>workchain</code> oraz <code>shard</code> z odpowiedzi; granica nie jest włączana. Stronicowanie kończy się na podziale lub połączeniu sharda.</p>"
  ],
  "get-block": [
    "Szczegóły bloku",
    "<p>Użyj numeru sekwencyjnego lub pełnego identyfikatora <code>(workchain,shard,seqno)</code>. Numer sekwencyjny używa wybranego workchaina i sharda; bez wyboru używa domyślnego workchaina hosta i sharda głównego. Zwraca hashe, znaczniki czasu, czasy logiczne, odwołania i pola przepływu wartości.</p>"
  ],
  "get-block-transactions": [
    "Transakcje bloku",
    "<p>Zwraca transakcje zawarte we wskazanym bloku.</p>"
  ],
  "get-block-shards": [
    "Odwołania masterchain do shardów",
    "<p>Użyj numeru sekwencyjnego masterchain lub identyfikatora bloku masterchain. Zwraca odpowiadające odwołania do shardów.</p>"
  ],
  "get-network-transactions": [
    "Transakcje sieci",
    "<p>Zwraca transakcje w shardach w jednym przedziale masterchain. Kontynuuj w tym przedziale za pomocą <code>master_seqno=_paging.masterSeqno</code> i <code>offset=_paging.nextOffset</code>. Gdy <code>nextOffset</code> ma wartość null, kontynuuj zamiast tego za pomocą <code>before=_paging.nextBefore</code>. Limity są ograniczone do 50.</p>"
  ],
  "get-transactions": [
    "Transakcje masterchain",
    "<p>Zwraca transakcje z jednego bloku masterchain. Kontynuuj za pomocą <code>before=_paging.nextBefore</code>. Są to transakcje masterchain, a nie wszystkie transakcje we wszystkich shardach.</p>"
  ],
  "get-validators": [
    "Walidatorzy",
    "<p>Zwraca informacje o wyborach walidatorów, kwoty stake i wpisy walidatorów.</p>"
  ],
  "get-dns": [
    "Szczegóły domeny",
    "<p>Tożsamość domeny, data wygaśnięcia i powiązane NFT. Dodaj <code>/resolve</code>, aby uzyskać rekordy portfela, strony, przechowywania i resolvera, lub <code>/bids</code>, aby uzyskać historię ofert.</p>"
  ],
  "get-auctions": [
    "Aukcje DNS",
    "<p>Bieżące aukcje domen. Wybierz <code>ton</code> lub <code>t.me</code>.</p>"
  ],
  "get-dns-expiring": [
    "Wygasające domeny",
    "<p>Zwraca domeny zbliżające się do wygaśnięcia. Opcjonalne <code>period</code> oznacza liczbę dni przed wygaśnięciem.</p>"
  ],
  "get-staking-pool": [
    "Pula stakingowa",
    "<p>Stake puli, nominujący, cykl, implementacja i roczna stopa zwrotu. Dodaj <code>/history</code>, aby uzyskać zaobserwowaną historię APY.</p>"
  ],
  "get-extra-currency": [
    "Dodatkowa waluta",
    "<p>Identyfikator waluty, symbol, liczba miejsc dziesiętnych i obraz.</p>"
  ],
  "get-extra-currency-history": [
    "Historia dodatkowej waluty",
    "<p>Zdarzenia konta dla wybranej waluty. Kontynuuj za pomocą <code>before_lt</code>.</p>"
  ],
  "get-block-boc": [
    "BOC bloku",
    "<p>Pobiera blok jako binarny Bag of Cells.</p>"
  ],
  "get-config-raw": [
    "Surowa konfiguracja",
    "<p>Surowa konfiguracja sieci. Dodaj <code>master_seqno</code>, aby zażądać historycznej konfiguracji masterchain.</p>"
  ],
  "get-config": [
    "Konfiguracja blockchain",
    "<p>Zwraca zdekodowane parametry konfiguracji blockchain. Dodaj <code>master_seqno</code>, aby uzyskać historyczną konfigurację masterchain.</p>"
  ],
  "get-rates": [
    "Kursy GRAM",
    "<p>Zwraca kursy GRAM w AUD, CAD, CHF, EUR, GBP, JPY i USD.</p>"
  ],
  "get-transaction": [
    "Szczegóły transakcji",
    "<p>Zwraca transakcję konta, wiadomości, opłaty, fazy i zmiany stanu oraz dostępne szczegóły śladu i zinterpretowanych zdarzeń. <code>relatedUnavailable</code> wskazuje powiązane sekcje, których nie udało się wczytać.</p>"
  ],
  "get-message": [
    "Transakcja według hasha wiadomości",
    "<p>Znajduje transakcję powiązaną z podanym hashem wiadomości.</p>"
  ],
  "get-trace": [
    "Ślad",
    "<p>Zwraca drzewo powiązanych transakcji ze śladami podrzędnymi i szczegółami wykonania.</p>"
  ],
  "resolve": [
    "Rozpoznaj dane wyszukiwania",
    "<p>Rozpoznaje konto TON, NFT, kolekcję, jetton, transakcję, hash wiadomości, identyfikator bloku lub domenę .ton. Zwraca typ i identyfikator obiektu.</p>"
  ],
  "get-account": [
    "Szczegóły konta",
    "<p>Zwraca saldo, status, interfejsy kontraktu, dostępny stan blockchain i nazwy DNS. Stan może zawierać kod, dane, informacje o przechowywaniu i dodatkowe waluty.</p>"
  ],
  "get-account-transactions": [
    "Transakcje konta",
    "<p>Wyświetla transakcje konta. Kontynuuj za pomocą <code>before_lt=_paging.nextBeforeLt</code>; akceptowane jest również <code>after_lt</code>.</p>"
  ],
  "get-account-events": [
    "Transfery i zdarzenia konta",
    "<p>Zwraca zinterpretowane działania i ich statusy. Kontynuuj za pomocą <code>before_lt</code>.</p>"
  ],
  "get-account-jettons": [
    "Salda jettonów",
    "<p>Zwraca salda z metadanymi kontraktów głównych i adresami portfeli jettonów konta.</p>"
  ],
  "get-account-nfts": [
    "NFT konta",
    "<p>Zwraca przedmioty NFT, domyślnie uwzględniając rozpoznaną pośrednią własność przez sprzedaż. Filtruj za pomocą <code>collection</code> lub użyj <code>indirect_ownership=false</code>, aby uwzględnić tylko własność bezpośrednią. Kontynuuj za pomocą <code>offset=_paging.nextOffset</code>.</p>"
  ],
  "get-account-nft-history": [
    "Operacje NFT",
    "<p>Zwraca operacje NFT konta. Kontynuuj za pomocą <code>before_lt</code>.</p>"
  ],
  "get-account-jetton-history": [
    "Historia jettonów",
    "<p>Zwraca zdarzenia jettonów dla konta. Kontynuuj za pomocą <code>before_lt</code>.</p>"
  ],
  "get-inspect": [
    "Inspekcja kontraktu",
    "<p>Zwraca dostępne szczegóły inspekcji kontraktu i rozpoznane interfejsy.</p>"
  ],
  "get-method": [
    "Odczytaj metodę kontraktu",
    "<p>Wykonuje metodę odczytu. Podaj każdy argument jako powtarzany parametr <code>args</code>, na przykład <code>?args=123&args=456</code>. Argumenty pozostają ciągami i mogą zawierać wartości całkowite, adresy lub BOC akceptowane przez metodę.</p>"
  ],
  "get-staking": [
    "Pule stakingowe",
    "<p>Zwraca pozycje konta w pulach nominujących.</p>"
  ],
  "get-multisig": [
    "Kontrakt wielopodpisowy",
    "<p>Zwraca próg kontraktu wielopodpisowego, sygnatariuszy, proponujących, numer sekwencyjny i zlecenia. Użyj poniższej trasy w liczbie mnogiej, aby znaleźć portfele wielopodpisowe powiązane z portfelem sygnatariusza.</p>"
  ],
  "get-multisigs": [
    "Rekordy wielopodpisowe",
    "<p>Zwraca rekordy wielopodpisowe powiązane z kontem.</p>"
  ],
  "get-subscriptions": [
    "Subskrypcje",
    "<p>Zwraca rekordy subskrypcji konta.</p>"
  ],
  "get-defi": [
    "Aktywa DeFi",
    "<p>Zwraca rozpoznane pozycje i aktywa DeFi konta.</p>"
  ],
  "get-nft": [
    "Przedmiot NFT",
    "<p>Zwraca właściciela przedmiotu, kolekcję, metadane, podglądy mediów, wiarygodność i pola sprzedaży. <code>indexVerified</code> wskazuje, czy <code>index</code> zostało potwierdzone przez <code>get_nft_data</code>; oryginalny indeks pozostaje w <code>indexed_index</code>.</p>"
  ],
  "get-sbt": [
    "Szczegóły niezbywalnego NFT",
    "<p>Dla niezbywalnego NFT zwraca z kontraktu adres organu i znacznik czasu odwołania. Zerowy znacznik czasu odwołania oznacza brak odwołania. Przedmioty soulbound są niezbywalne.</p>"
  ],
  "get-nft-history": [
    "Historia NFT",
    "<p>Zwraca zdarzenia pojedynczego NFT. Kontynuuj za pomocą <code>before_lt</code>.</p>"
  ],
  "get-collection": [
    "Szczegóły kolekcji",
    "<p>Zwraca właściciela kolekcji, zawartość, metadane i podglądy. Gdy <code>indexVerified</code> ma wartość true, <code>next_item_index</code> jest potwierdzone przez metodę odczytu kolekcji; nie musi być całkowitą liczbą przedmiotów.</p>"
  ],
  "get-collection-items": [
    "Przedmioty kolekcji",
    "<p>Zwraca przedmioty NFT z kolekcji. Kontynuuj za pomocą <code>offset=_paging.nextOffset</code>.</p>"
  ],
  "get-jetton": [
    "Szczegóły jettona",
    "<p>Zwraca metadane kontraktu głównego, całkowitą podaż, administrację, liczbę miejsc dziesiętnych i liczbę posiadaczy.</p>"
  ],
  "get-jetton-holders": [
    "Posiadacze jettona",
    "<p>Zwraca wpisy posiadaczy pod <code>addresses</code>. Kontynuuj za pomocą <code>offset=_paging.nextOffset</code>. Wartości sald używają liczby miejsc dziesiętnych jettona.</p>"
  ],
  "websocket-connect": [
    "Połącz",
    "<p>Połącz się z tym samym hostem pod <code>/api/v1/ws</code> i wyślij <code>init</code>, aby uzyskać bieżący stan. Domyślnie wybrane są bloki basechain. Dodaj <code>?workchain=-1</code> dla masterchain lub <code>?workchain=0&amp;shard=...</code> dla sharda basechain. Użyj REST API dla poszczególnych kont, NFT, transakcji i śladów.</p>"
  ],
  "websocket-init": [
    "Bieżący stan",
    "<p>Odpowiedź zawiera ostatnie ujednolicone <code>blocks</code> z wybranego workchaina i sharda oraz obiekt <code>ton</code> z ostatnim blokiem, zaobserwowaną historią, czasem obserwacji i stanem nieaktualnych danych. Użyj <code>ton.head</code> dla pełnych pól wybranego bloku i <code>ton.masterchainHead</code> dla ostatniego bloku masterchain sieci. Wyślij <code>{\"action\":\"select\",\"workchain\":-1}</code>, aby przełączyć otwarte połączenie na masterchain.</p>"
  ],
  "websocket-ping": [
    "Utrzymuj aktywne połączenie",
    "<p>Wyślij ping, aby sprawdzić połączenie. Po ponownym połączeniu wyślij ponownie <code>init</code>, aby uzyskać bieżący stan.</p>"
  ],
  "websocket-stale": [
    "Opóźnione aktualizacje",
    "<p>Gdy <code>ton.stale</code> ma wartość true, zachowaj ostatnie dostępne bloki i oznacz je jako opóźnione. <code>ton.observedAt</code> jest znacznikiem czasu obserwacji. Sam stan połączenia WebSocket nie dowodzi aktualności danych.</p>"
  ]
};
export function translateTonDocsPolish(items: TonDocItem[], locale: string): TonDocItem[] {
  if (!locale.toLowerCase().startsWith('pl')) return items;
  return items.map(item => {
    if (item.type === 'category') return { ...item, title: categories[item.title] || item.title };
    const translated = entries[item.fragment];
    return { ...item, title: translated?.[0] || item.title, description: translated?.[1] || item.description, category: categories[item.category] || item.category };
  });
}
