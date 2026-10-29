import { TonDocItem } from './ton-docs-data';

// Source-fingerprinted translations; endpoints and examples remain unchanged.
const categories: Record<string, string> = {
  "TON basics": "TON 기본 사항",
  "Wallets and contracts": "지갑과 컨트랙트",
  "Jettons and NFTs": "제톤과 NFT",
  "Using tx.taxi": "tx.taxi 사용하기",
  "Conventions": "공통 규칙",
  "Network and blocks": "네트워크와 블록",
  "Transactions and messages": "트랜잭션과 메시지",
  "Accounts and contracts": "계정과 컨트랙트",
  "NFTs and jettons": "NFT와 제톤",
  "Live block updates": "실시간 블록 업데이트",
  "Network": "네트워크",
  "Transactions": "트랜잭션",
  "Accounts": "계정",
  "Contracts": "컨트랙트",
  "Jettons": "제톤",
  "NFTs": "NFT",
  "Collectibles": "수집품",
  "Assets": "자산",
  "Search": "검색",
  "Live data": "실시간 데이터",
  "Support": "지원",
  "Reference": "참고",
  "Blocks": "블록",
  "Messages": "메시지",
  "Connection": "연결",
  "State": "상태"
};
const entries: Record<string, [string, string]> = {
  "masterchain-and-shards": [
    "마스터체인과 샤드 블록은 무엇인가요?",
    "<p>마스터체인은 전역 설정을 보유하고 샤드체인의 상태를 참조합니다. 대부분의 사용자 계정은 여러 샤드로 나뉠 수 있는 베이스체인에 있습니다. 블록은 워크체인, 샤드, 시퀀스 번호를 함께 사용해 식별합니다. 시퀀스 번호만으로는 전체 네트워크의 블록 높이를 나타내지 않습니다.</p><p>상단 블록 줄에는 베이스체인 블록이 표시됩니다. 마스터체인 블록을 보려면 검색 메뉴를 열고 선택 항목 아래에서 Masterchain을 선택하세요. 활성 샤드가 여러 개라면 샤드를 선택합니다. 블록을 열어 트랜잭션을 확인할 수 있으며, 마스터체인 블록에는 참조된 샤드 링크도 있습니다.</p>"
  ],
  "transactions-and-messages": [
    "트랜잭션, 메시지, 추적은 어떻게 연결되나요?",
    "<p>트랜잭션은 한 계정이 메시지 또는 시스템 작업을 처리한 기록입니다. 메시지는 계정을 연결하며, 수신 메시지를 처리하면 발신 메시지와 추가 트랜잭션이 생길 수 있습니다. 추적은 이렇게 연결된 트랜잭션을 따라갑니다.</p><p>개별 실행은 트랜잭션 페이지에서, 계약 간 전송은 메시지에서, 더 넓은 작업은 추적에서 확인하세요. <a href=\"https://docs.ton.org/start-here\" target=\"_blank\" rel=\"noopener noreferrer\">TON 기초</a>.</p>"
  ],
  "logical-time": [
    "논리 시간이란 무엇인가요?",
    "<p>논리 시간(LT)은 트랜잭션과 메시지의 순서를 정합니다. 트랜잭션 날짜로 표시되는 Unix 타임스탬프와는 다릅니다. 계정 기록은 페이지 이동 커서로 LT를 사용하므로 정확한 정수 문자열로 보존하세요.</p>"
  ],
  "fees-and-phases": [
    "수수료는 어디에 사용되나요?",
    "<p>실행에는 저장, 크레딧, 계산, 동작 및 반송 단계가 포함될 수 있습니다. 트랜잭션 페이지에는 총 수수료와 가스 사용량, 전달 비용, 종료 코드 등을 포함한 기록된 단계 정보가 표시됩니다. 실패한 작업에도 수수료가 발생할 수 있습니다.</p><p>GRAM은 TON의 기본 통화이며 소수점 이하 9자리를 사용합니다. 1 GRAM = 1,000,000,000 나노그램입니다. 메시지 금액과 트랜잭션 수수료는 서로 다른 금액입니다.</p>"
  ],
  "bounce-and-failure": [
    "반송 또는 실패는 무엇을 의미하나요?",
    "<p>반송 가능한 메시지를 적용 가능한 규칙에 따라 처리할 수 없으면 반송 메시지가 응답을 반환합니다. 이는 자체 금액과 비용을 가진 별도의 메시지입니다. 트랜잭션 결과, 계산 및 동작 결과, 발신 메시지를 함께 확인하세요.</p><p>확인된 트랜잭션도 실행이 실패할 수 있습니다. 한 트랜잭션의 성공만으로 추적 내 이후 트랜잭션이 모두 성공했다고 볼 수는 없습니다. <a href=\"https://docs.ton.org/resources/pdfs/tblkch.pdf\" target=\"_blank\" rel=\"noopener noreferrer\">TON 블록체인 사양</a>.</p>"
  ],
  "confirmation": [
    "확인은 작업 완료와 같은 뜻인가요?",
    "<p>확인은 트랜잭션이 블록에 포함되었다는 뜻입니다. 여러 계약에 걸친 작업에는 추가 트랜잭션과 메시지가 포함될 수 있습니다. 첫 트랜잭션을 전체 전송으로 간주하지 말고 전체 추적과 최종 수신자를 확인하세요.</p>"
  ],
  "wallets-and-state": [
    "계정 페이지에는 무엇이 표시되나요?",
    "<p>계정에는 GRAM 잔액, 상태, 최근 활동, 감지된 계약 인터페이스가 표시됩니다. 기록은 인식된 동작을 묶고, 트랜잭션은 계정의 트랜잭션을 나열합니다. Jetton과 NFT에는 별도 탭이 있습니다.</p><p>계약 탭에는 상태, 코드와 데이터, 읽기 전용 메서드, 사용 가능한 스테이킹, 멀티시그, 구독 및 DeFi 기록이 있습니다. 추가 필드와 추가 통화는 계정 세부정보를 펼쳐 확인하세요.</p>"
  ],
  "addresses-and-dns": [
    "같은 계정에 서로 다른 주소가 있을 수 있는 이유는 무엇인가요?",
    "<p>TON 계정은 원시 워크체인과 16진수 계정 ID 또는 사용자 친화적 주소로 표시할 수 있습니다. 반송 가능 여부와 네트워크 플래그에 따라 기본 계정은 바뀌지 않아도 사용자 친화적 표기는 달라질 수 있습니다.</p><p>검색은 TON 주소와 .ton 이름을 지원합니다. DNS 해석 결과는 해당 계정으로 연결되지만 도메인 이름이 계정 주소 확인을 대신하지는 않습니다.</p>"
  ],
  "contract-methods": [
    "스마트 계약을 읽을 수 있나요?",
    "<p>계약 탭에서 나열된 getter를 선택하고 필요한 경우 인수를 입력하세요. 읽기는 트랜잭션에 서명하지 않고 결과를 반환합니다. 인수는 쉼표로 구분된 문자열 또는 문자열의 JSON 배열을 사용할 수 있으며, 큰 정수는 문자열로 보존하세요.</p><p>계정 세부정보에는 코드, 데이터 및 저장 필드가 유지됩니다. 검사는 인식된 인터페이스와 사용 가능한 컴파일러 정보를 보여줍니다.</p>"
  ],
  "validators": [
    "검증자 페이지에는 무엇이 표시되나요?",
    "<p>검증자 페이지는 선거 시각, 총 및 최소 스테이크, 참여 검증자의 계정, 스테이크, ADNL 주소를 표시합니다. 이 필드는 표시된 선거 데이터를 설명하며 스테이크를 보유한 주소가 특정 블록의 생산자라는 뜻은 아닙니다.</p>"
  ],
  "jettons": [
    "Jetton은 어떻게 작동하나요?",
    "<p>Jetton에는 마스터 계약과 보유자별 Jetton 지갑 계약이 있습니다. 이름이나 기호가 아닌 마스터 주소로 식별하세요. Jetton 페이지에는 공급량, 소수 자릿수, 관리 정보 및 보유자가 표시됩니다.</p><p>잔액을 표시할 때는 해당 Jetton의 소수 자릿수를 사용하세요. 모든 Jetton이 소수 9자리를 사용한다고 가정하지 마세요. <a href=\"https://docs.ton.org/contracts/standard/tokens/jettons/overview\" target=\"_blank\" rel=\"noopener noreferrer\">Jetton 표준</a>.</p>"
  ],
  "scaled-jettons": [
    "Jetton 표시 잔액이 온체인 금액과 다를 수 있는 이유는 무엇인가요?",
    "<p>일부 Jetton은 표시 배율을 사용합니다. 현재 지갑 잔액, 보유자 잔액 및 총 공급량에는 해당 비율을 정확하게 반올림해 적용한 다음 토큰의 소수 자릿수를 적용합니다. 온체인 금액, 원시 단위 및 비율은 금액 세부정보를 펼쳐 확인하세요.</p><p>과거 전송은 기록된 온체인 수량을 유지합니다. 현재 배율이 당시 배율을 증명하지는 않습니다. <a href=\"https://github.com/ton-blockchain/TEPs/blob/master/text/0526-scaled-ui-jettons.md\" target=\"_blank\" rel=\"noopener noreferrer\">스케일 UI Jetton 표준</a>.</p>"
  ],
  "nft-identity": [
    "NFT는 무엇으로 식별하나요?",
    "<p>NFT 항목의 계약 주소가 식별자입니다. 컬렉션, 소유자 및 항목 인덱스는 별도 필드입니다. 컬렉션 소속 검증은 항목과 컬렉션의 관계를 확인할 뿐 이미지, 이름 또는 판매자의 신뢰성을 증명하지는 않습니다.</p><p>NFT 계약에서 확인한 경우 항목 세부정보에 정확한 인덱스가 표시됩니다. NFT 이름에 표시된 번호가 온체인 인덱스와 같을 필요는 없습니다.</p>"
  ],
  "nft-metadata": [
    "이미지와 속성은 어디에서 오나요?",
    "<p>TEP-64은 온체인, 오프체인 및 결합 메타데이터를 지원합니다. NFT 페이지에는 이름, 설명, 이미지와 속성이 표시되며 전체 메타데이터를 펼칠 수 있습니다. 다른 곳에서 호스팅되는 미디어나 메타데이터는 변경되거나 사용할 수 없게 될 수 있습니다.</p><p>애니메이션은 항목 페이지에서 직접 여세요. 미디어가 없어도 NFT 계약이나 소유권 기록이 삭제되는 것은 아닙니다. <a href=\"https://github.com/ton-blockchain/TEPs/blob/master/text/0064-token-data-standard.md\" target=\"_blank\" rel=\"noopener noreferrer\">토큰 메타데이터 표준</a>.</p>"
  ],
  "nft-sales": [
    "NFT를 판매 계약이 소유하는 이유는 무엇인가요?",
    "<p>판매 등록된 NFT는 마켓플레이스 판매 계약이 보유할 수 있습니다. 지갑 NFT 목록에는 인식된 간접 판매 소유권이 포함됩니다. 항목 페이지는 온체인 소유자, 판매자, 판매 계약 및 가격 통화를 구분합니다.</p><p>판매 등록은 완료된 전송이 아닙니다. 전송 기록으로 변경 사항을 추적하고 컬렉션 페이지에서 항목을 살펴보세요.</p>"
  ],
  "telegram-collectibles": [
    "모든 Telegram 선물을 온체인에서 볼 수 있나요?",
    "<p>아니요. 여기에서 온체인 항목 주소와 소유권 기록을 가지려면 선물이 TON NFT로 존재해야 합니다. Telegram 선물, 수집 가능한 사용자 이름과 번호에는 관련 TON NFT가 있을 수 있지만 Telegram 프로필이나 일반 사용자 이름만으로는 지갑 소유권을 증명할 수 없습니다.</p><p>수집품이 Telegram 프로필에 표시되더라도 소유자는 TON 지갑일 수 있습니다. 항목 주소, 컬렉션 및 현재 소유자를 확인하세요. <a href=\"https://core.telegram.org/api/gifts\" target=\"_blank\" rel=\"noopener noreferrer\">Telegram 수집품 선물</a>.</p>"
  ],
  "nft-pagination": [
    "계정이나 컬렉션의 모든 NFT를 보려면 어떻게 하나요?",
    "<p>NFT 목록 아래의 더 불러오기를 사용해 컬렉션이나 지갑을 계속 탐색하세요. NFT 탭에는 반환된 각 항목이 전체 이름과 상세 링크와 함께 개별적으로 표시됩니다. 지갑의 NFT 컬렉션과 트랜잭션 기록은 별도의 목록입니다.</p>"
  ],
  "trust-and-identity": [
    "인식 라벨은 무엇을 의미하나요?",
    "<p>컬렉션 소속, 신뢰 분류 및 마켓플레이스 승인은 서로 다른 사실입니다. 인식된 이름과 이미지는 소유권 증명이 아닙니다. 이름이 비슷한 자산을 같은 토큰으로 간주하기 전에 계약 주소와 컬렉션 링크를 비교하세요.</p>"
  ],
  "automatic-routing": [
    "자동 라우팅은 어떻게 작동하나요?",
    "<p>주소, 트랜잭션 해시, 메시지 해시, 블록 번호 또는 .ton 이름을 검색창에 붙여 넣으세요. 자동 라우팅을 사용하면 택시가 해당 체인을 찾습니다. 기본 탐색기를 선택하면 해당 체인의 검색을 사용할 수 있고, 허브 보기를 선택하면 tx.taxi로 돌아갑니다.</p>"
  ],
  "updates": [
    "업데이트 지연은 무엇을 의미하나요?",
    "<p>새 업데이트가 지연되는 동안 마지막으로 사용할 수 있었던 데이터가 계속 표시됩니다. 사용할 수 없는 부분은 다시 시도하여 불러오세요. 빈 목록과 사용할 수 없는 목록은 서로 다른 상태입니다.</p>"
  ],
  "wallet-support": [
    "tx.taxi에서 트랜잭션을 되돌릴 수 있나요?",
    "<p>tx.taxi는 공개 체인 데이터를 표시합니다. 트랜잭션에 서명하거나 개인 키에 접근하거나 전송을 되돌릴 수 없습니다. 지갑이나 거래소 계정 지원은 해당 작업을 제출한 서비스에 문의하세요.</p>"
  ],
  "api-values": [
    "값과 페이지네이션",
    "<p>아래 모든 경로는 GET을 사용합니다. 정밀도가 중요한 정수는 십진수 문자열이므로 임의 정밀도 연산으로 파싱하세요. GRAM 잔액과 수수료는 나노그램 단위입니다. Jetton 금액에는 선언된 소수 자릿수를 사용합니다.</p><p>페이지로 나뉜 응답에는 <code>_paging</code>이 포함됩니다. <code>hasMore</code>이 true인 동안에만 해당 엔드포인트에 맞는 <code>nextOffset</code>, <code>nextBeforeLt</code> 또는 <code>nextBefore</code>를 사용해 계속하세요. 목록 제한은 100, 블록 목록 제한은 16입니다.</p><p><code>_meta.observedAt</code>는 관측 시각을 나타내고 <code>_meta.stale</code>은 유지된 데이터를 표시합니다. HTTP 400는 잘못된 입력, 404는 찾을 수 없음, 503은 일시적으로 사용할 수 없음을 뜻합니다.</p>"
  ],
  "get-dashboard": [
    "네트워크 개요",
    "<p>선택된 워크체인과 샤드, 최근 블록, 관측 기록, 관측 시각 및 지연 상태를 반환합니다. 기본값은 베이스체인입니다. 마스터체인은 <code>workchain=-1</code>, 활성 베이스체인 샤드는 <code>workchain=0&amp;shard=...</code>을 사용하세요. <code>activeShards</code>는 사용 가능한 샤드를 나열하고 <code>masterchainHead</code>은 네트워크의 최신 마스터체인 블록입니다.</p>"
  ],
  "get-blocks": [
    "블록",
    "<p>하나의 워크체인과 샤드의 블록을 시퀀스 번호 내림차순으로 반환합니다. 기본값은 베이스체인이며 마스터체인 블록에는 <code>workchain=-1</code>을 사용합니다. <code>before=_paging.nextBefore</code>로 계속하고 응답의 <code>workchain</code>와 <code>shard</code>을 유지하세요. 경계는 결과에 포함되지 않습니다. 샤드 분할이나 병합에서 페이지 이동이 중단됩니다.</p>"
  ],
  "get-block": [
    "블록 세부정보",
    "<p>시퀀스 번호 또는 전체 <code>(workchain,shard,seqno)</code> 식별자를 사용합니다. 시퀀스 번호에는 선택한 워크체인과 샤드가 사용되며, 선택하지 않은 경우 호스트의 기본 워크체인과 루트 샤드가 사용됩니다. 해시, 타임스탬프, 논리 시간, 참조 및 값 흐름 필드를 반환합니다.</p>"
  ],
  "get-block-transactions": [
    "블록 트랜잭션",
    "<p>지정된 블록에 포함된 트랜잭션을 반환합니다.</p>"
  ],
  "get-block-shards": [
    "마스터체인 샤드 참조",
    "<p>마스터체인 시퀀스 번호 또는 마스터체인 블록 식별자를 사용합니다. 해당 샤드 참조를 반환합니다.</p>"
  ],
  "get-network-transactions": [
    "네트워크 트랜잭션",
    "<p>하나의 마스터체인 구간에 있는 샤드 전반의 트랜잭션을 반환합니다. 해당 구간 내에서는 <code>master_seqno=_paging.masterSeqno</code>과 <code>offset=_paging.nextOffset</code>을 사용해 계속합니다. <code>nextOffset</code>가 null이면 대신 <code>before=_paging.nextBefore</code>으로 계속합니다. 제한은 최대 50입니다.</p>"
  ],
  "get-transactions": [
    "마스터체인 트랜잭션",
    "<p>하나의 마스터체인 블록에서 트랜잭션을 반환합니다. <code>before=_paging.nextBefore</code>으로 계속합니다. 이는 마스터체인 트랜잭션이며 모든 샤드의 전체 트랜잭션이 아닙니다.</p>"
  ],
  "get-validators": [
    "검증자",
    "<p>검증자 선거 정보, 스테이크 금액과 검증자 항목을 반환합니다.</p>"
  ],
  "get-dns": [
    "도메인 세부정보",
    "<p>도메인 식별 정보, 만료 및 연결된 NFT를 반환합니다. 지갑, 사이트, 저장 및 리졸버 기록에는 <code>/resolve</code>을, 입찰 기록에는 <code>/bids</code>을 추가하세요.</p>"
  ],
  "get-auctions": [
    "DNS 경매",
    "<p>현재 도메인 경매입니다. <code>ton</code> 또는 <code>t.me</code>을 선택하세요.</p>"
  ],
  "get-dns-expiring": [
    "만료 예정 도메인",
    "<p>만료가 가까운 도메인을 반환합니다. 선택적 <code>period</code>은 만료까지 남은 일수입니다.</p>"
  ],
  "get-staking-pool": [
    "스테이킹 풀",
    "<p>풀 스테이크, 지명자, 주기, 구현 방식 및 연 수익률을 반환합니다. 관측된 APY 기록에는 <code>/history</code>을 추가하세요.</p>"
  ],
  "get-extra-currency": [
    "추가 통화",
    "<p>통화 ID, 기호, 소수 자릿수와 이미지를 반환합니다.</p>"
  ],
  "get-extra-currency-history": [
    "추가 통화 기록",
    "<p>선택한 통화의 계정 이벤트를 반환합니다. <code>before_lt</code>으로 계속합니다.</p>"
  ],
  "get-block-boc": [
    "블록 BOC",
    "<p>블록을 이진 Bag of Cells로 다운로드합니다.</p>"
  ],
  "get-config-raw": [
    "원시 설정",
    "<p>원시 네트워크 설정을 반환합니다. 과거 마스터체인 설정을 요청하려면 <code>master_seqno</code>을 추가하세요.</p>"
  ],
  "get-config": [
    "블록체인 설정",
    "<p>디코딩된 블록체인 설정 매개변수를 반환합니다. 과거 마스터체인 설정에는 <code>master_seqno</code>을 추가하세요.</p>"
  ],
  "get-rates": [
    "GRAM 환율",
    "<p>GRAM의 AUD, CAD, CHF, EUR, GBP, JPY 및 USD 환율을 반환합니다.</p>"
  ],
  "get-transaction": [
    "트랜잭션 세부정보",
    "<p>계정 트랜잭션, 메시지, 수수료, 단계와 상태 변경 및 사용 가능한 추적과 해석된 이벤트 세부정보를 반환합니다. <code>relatedUnavailable</code>은 불러올 수 없었던 관련 섹션을 나타냅니다.</p>"
  ],
  "get-message": [
    "메시지 해시로 트랜잭션 검색",
    "<p>제공된 메시지 해시와 연결된 트랜잭션을 찾습니다.</p>"
  ],
  "get-trace": [
    "추적",
    "<p>하위 추적과 실행 세부정보가 포함된 연결 트랜잭션 트리를 반환합니다.</p>"
  ],
  "resolve": [
    "검색 입력 해석",
    "<p>TON 계정, NFT, 컬렉션, Jetton, 트랜잭션, 메시지 해시, 블록 식별자 또는 .ton 도메인을 해석합니다. 엔터티 유형과 식별자를 반환합니다.</p>"
  ],
  "get-account": [
    "계정 세부정보",
    "<p>잔액, 상태, 계약 인터페이스, 사용 가능한 블록체인 상태와 DNS 이름을 반환합니다. 상태에는 코드, 데이터, 저장 정보 및 추가 통화가 포함될 수 있습니다.</p>"
  ],
  "get-account-transactions": [
    "계정 트랜잭션",
    "<p>계정 트랜잭션을 나열합니다. <code>before_lt=_paging.nextBeforeLt</code>으로 계속하며 <code>after_lt</code>도 사용할 수 있습니다.</p>"
  ],
  "get-account-events": [
    "계정 전송 및 이벤트",
    "<p>해석된 동작과 상태를 반환합니다. <code>before_lt</code>으로 계속합니다.</p>"
  ],
  "get-account-jettons": [
    "Jetton 잔액",
    "<p>마스터 계약 메타데이터 및 계정의 Jetton 지갑 주소와 함께 잔액을 반환합니다.</p>"
  ],
  "get-account-nfts": [
    "계정 NFT",
    "<p>NFT 항목을 반환하며 기본적으로 인식된 간접 판매 소유권을 포함합니다. <code>collection</code>으로 필터링하거나 직접 소유권만 보려면 <code>indirect_ownership=false</code>을 사용하세요. <code>offset=_paging.nextOffset</code>로 계속합니다.</p>"
  ],
  "get-account-nft-history": [
    "NFT 작업",
    "<p>계정의 NFT 작업을 반환합니다. <code>before_lt</code>으로 계속합니다.</p>"
  ],
  "get-account-jetton-history": [
    "Jetton 기록",
    "<p>계정의 Jetton 이벤트를 반환합니다. <code>before_lt</code>으로 계속합니다.</p>"
  ],
  "get-inspect": [
    "계약 검사",
    "<p>사용 가능한 계약 검사 세부정보와 인식된 인터페이스를 반환합니다.</p>"
  ],
  "get-method": [
    "계약 메서드 읽기",
    "<p>읽기 전용 getter를 실행합니다. 예를 들어 <code>?args=123&args=456</code>처럼 각 인수를 반복되는 <code>args</code> 매개변수로 제공하세요. 인수는 문자열로 유지되며 메서드가 허용하는 정수, 주소 또는 BOC 값을 포함할 수 있습니다.</p>"
  ],
  "get-staking": [
    "스테이킹 풀",
    "<p>계정의 지명자 풀 포지션을 반환합니다.</p>"
  ],
  "get-multisig": [
    "멀티시그 계약",
    "<p>멀티시그 계약의 임계값, 서명자, 제안자, 시퀀스 번호 및 주문을 반환합니다. 서명자 지갑과 연결된 멀티시그를 찾으려면 아래 복수형 경로를 사용하세요.</p>"
  ],
  "get-multisigs": [
    "멀티시그 기록",
    "<p>계정과 연결된 멀티시그 기록을 반환합니다.</p>"
  ],
  "get-subscriptions": [
    "구독",
    "<p>계정의 구독 기록을 반환합니다.</p>"
  ],
  "get-defi": [
    "DeFi 자산",
    "<p>계정에서 인식된 DeFi 포지션과 자산을 반환합니다.</p>"
  ],
  "get-nft": [
    "NFT 항목",
    "<p>항목의 소유자, 컬렉션, 메타데이터, 미디어 미리보기, 신뢰 및 판매 필드를 반환합니다. <code>indexVerified</code>은 <code>index</code>이 <code>get_nft_data</code>로 확인되었는지 나타내며 원래 인덱스는 <code>indexed_index</code>에 유지됩니다.</p>"
  ],
  "get-sbt": [
    "소울바운드 NFT 세부정보",
    "<p>소울바운드 NFT의 계약에서 권한 주소와 철회 타임스탬프를 반환합니다. 철회 타임스탬프가 0이면 철회되지 않은 상태입니다. 소울바운드 항목은 전송할 수 없습니다.</p>"
  ],
  "get-nft-history": [
    "NFT 기록",
    "<p>개별 NFT의 이벤트를 반환합니다. <code>before_lt</code>으로 계속합니다.</p>"
  ],
  "get-collection": [
    "컬렉션 세부정보",
    "<p>컬렉션 소유자, 콘텐츠, 메타데이터 및 미리보기를 반환합니다. <code>indexVerified</code>이 true이면 <code>next_item_index</code>은 컬렉션 getter에서 확인되었으며 반드시 총 항목 수를 뜻하지는 않습니다.</p>"
  ],
  "get-collection-items": [
    "컬렉션 항목",
    "<p>컬렉션의 NFT 항목을 반환합니다. <code>offset=_paging.nextOffset</code>으로 계속합니다.</p>"
  ],
  "get-jetton": [
    "Jetton 세부정보",
    "<p>마스터 계약 메타데이터, 총 공급량, 관리 정보, 소수 자릿수와 보유자 수를 반환합니다.</p>"
  ],
  "get-jetton-holders": [
    "Jetton 보유자",
    "<p><code>addresses</code> 아래에 보유자 항목을 반환합니다. <code>offset=_paging.nextOffset</code>로 계속합니다. 잔액 값에는 해당 Jetton의 소수 자릿수를 사용합니다.</p>"
  ],
  "websocket-connect": [
    "연결",
    "<p>같은 호스트의 <code>/api/v1/ws</code>에 연결하고 <code>init</code>을 보내 현재 스냅샷을 가져옵니다. 기본적으로 베이스체인 블록이 선택됩니다. 마스터체인에는 <code>?workchain=-1</code>, 베이스체인 샤드에는 <code>?workchain=0&amp;shard=...</code>을 추가하세요. 개별 계정, NFT, 트랜잭션 및 추적에는 REST API를 사용합니다.</p>"
  ],
  "websocket-init": [
    "현재 스냅샷",
    "<p>응답에는 선택된 워크체인과 샤드의 최근 정규화된 <code>blocks</code>과 최신 블록, 관측 기록, 관측 시각 및 지연 상태를 담은 <code>ton</code> 객체가 포함됩니다. 선택된 블록의 전체 필드에는 <code>ton.head</code>, 네트워크의 최신 마스터체인 블록에는 <code>ton.masterchainHead</code>을 사용합니다. 열린 연결을 마스터체인으로 전환하려면 <code>{\"action\":\"select\",\"workchain\":-1}</code>를 보냅니다.</p>"
  ],
  "websocket-ping": [
    "연결 유지",
    "<p>연결을 확인하려면 ping을 보냅니다. 재연결 시 <code>init</code>을 다시 보내 현재 스냅샷을 가져옵니다.</p>"
  ],
  "websocket-stale": [
    "지연된 업데이트",
    "<p><code>ton.stale</code>이 true이면 마지막으로 사용할 수 있었던 블록을 유지하고 지연으로 표시하세요. <code>ton.observedAt</code>은 관측 타임스탬프입니다. WebSocket 연결 상태만으로 데이터의 최신성을 확인할 수는 없습니다.</p>"
  ]
};
export function translateTonDocsKorean(items: TonDocItem[], locale: string): TonDocItem[] {
  if (!locale.toLowerCase().startsWith('ko')) return items;
  return items.map(item => {
    if (item.type === 'category') return { ...item, title: categories[item.title] || item.title };
    const translated = entries[item.fragment];
    return { ...item, title: translated?.[0] || item.title, description: translated?.[1] || item.description, category: categories[item.category] || item.category };
  });
}
