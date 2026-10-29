import { TonDocItem } from './ton-docs-data';

// Source-fingerprinted translations; endpoints and examples remain unchanged.
const categories: Record<string, string> = {
  "TON basics": "TON 基础",
  "Wallets and contracts": "钱包与合约",
  "Jettons and NFTs": "Jetton 与 NFT",
  "Using tx.taxi": "使用 tx.taxi",
  "Conventions": "通用约定",
  "Network and blocks": "网络与区块",
  "Transactions and messages": "交易与消息",
  "Accounts and contracts": "账户与合约",
  "NFTs and jettons": "NFT 与 Jetton",
  "Live block updates": "实时区块更新",
  "Network": "网络",
  "Transactions": "交易",
  "Accounts": "账户",
  "Contracts": "合约",
  "Jettons": "Jetton",
  "NFTs": "NFT",
  "Collectibles": "收藏品",
  "Assets": "资产",
  "Search": "搜索",
  "Live data": "实时数据",
  "Support": "支持",
  "Reference": "参考",
  "Blocks": "区块",
  "Messages": "消息",
  "Connection": "连接",
  "State": "状态"
};
const entries: Record<string, [string, string]> = {
  "masterchain-and-shards": [
    "主链和分片区块是什么意思？",
    "<p>主链保存全局配置，并引用分片链的状态。大多数用户账户位于基础链，基础链可以划分为多个分片。区块由工作链、分片和序列号共同标识；单独的序列号并不是全网区块高度。</p><p>顶部区块条显示基础链区块。打开搜索菜单，在“已选择”下选择 Masterchain 即可查看主链区块。如果有多个活跃分片，请选择一个分片。打开区块可查看交易；主链区块还会链接到其引用的分片。</p>"
  ],
  "transactions-and-messages": [
    "交易、消息和追踪之间有什么关系？",
    "<p>一笔交易记录一个账户处理消息或系统操作的过程。消息连接不同账户；处理传入消息可能产生传出消息和后续交易。追踪会串联这些相关交易。</p><p>交易页面用于查看单次执行，消息用于查看合约之间的转移，追踪用于查看更广泛的操作。<a href=\"https://docs.ton.org/start-here\" target=\"_blank\" rel=\"noopener noreferrer\">TON基础知识</a>。</p>"
  ],
  "logical-time": [
    "什么是逻辑时间？",
    "<p>逻辑时间（LT）用于排列交易和消息的顺序，它不同于交易日期显示的 Unix 时间戳。账户历史使用 LT 作为分页游标；请将其保留为精确的整数字符串。</p>"
  ],
  "fees-and-phases": [
    "手续费花在哪里了？",
    "<p>执行可能包括存储、信用、计算、动作和弹回阶段。交易页面显示总手续费和记录的阶段详情，包括 gas 使用量、转发费用和退出代码。失败的操作也可能支付手续费。</p><p>GRAM 是TON的原生货币，使用9位小数：1 GRAM = 1,000,000,000纳克。消息金额和交易手续费是不同的金额。</p>"
  ],
  "bounce-and-failure": [
    "弹回或失败是什么意思？",
    "<p>当可弹回消息无法按照适用规则处理时，弹回消息会返回一个响应。它是一条单独的消息，有自己的金额和费用。应结合交易结果、计算和动作结果以及传出消息一起检查。</p><p>已确认交易的执行仍可能失败。一笔交易成功也不能证明追踪中之后的所有交易都成功。<a href=\"https://docs.ton.org/resources/pdfs/tblkch.pdf\" target=\"_blank\" rel=\"noopener noreferrer\">TON区块链规范</a>。</p>"
  ],
  "confirmation": [
    "确认是否等于操作完成？",
    "<p>确认表示交易已被包含在区块中。涉及多个合约的操作可能包含更多交易和消息。请检查完整追踪和最终收款方，不要把第一笔交易视为整个转移。</p>"
  ],
  "wallets-and-state": [
    "账户页面显示什么？",
    "<p>账户页面显示 GRAM 余额、状态、最近活动和检测到的合约接口。“历史”按已识别的动作分组；“交易”列出账户交易。Jetton 和 NFT 分别有独立标签。</p><p>“合约”标签包含状态、代码和数据、只读方法，以及可用的质押、多签、订阅和 DeFi 记录。展开“账户详情”可查看其他字段和额外货币。</p>"
  ],
  "addresses-and-dns": [
    "为什么同一个账户可能有不同地址？",
    "<p>TON账户可以表示为原始工作链与十六进制账户 ID，也可以表示为用户友好地址。弹回属性和网络标志可能改变用户友好表示形式，但不会改变底层账户。</p><p>搜索支持TON地址和 .ton 名称。DNS 解析会链接到解析后的账户；域名不能替代对账户地址的核对。</p>"
  ],
  "contract-methods": [
    "可以读取智能合约吗？",
    "<p>在“合约”标签中选择列出的 getter，并在需要时提供参数。读取会返回结果，无需签署交易。参数可以是逗号分隔的字符串或字符串组成的JSON数组；大整数应保留为字符串。</p><p>账户详情保留代码、数据和存储字段。合约检查显示已识别接口和可用的编译器信息。</p>"
  ],
  "validators": [
    "验证者页面显示什么？",
    "<p>验证者页面显示选举时间、总质押额和最低质押额，以及参与验证者的账户、质押额和 ADNL 地址。这些字段描述所显示的选举数据；持有质押的地址不一定是某个特定区块的生产者。</p>"
  ],
  "jettons": [
    "Jetton 如何运作？",
    "<p>Jetton 有一个主合约，以及为持有者分别设置的 Jetton 钱包合约。应通过主合约地址识别，而不是通过名称或符号。Jetton 页面显示供应量、小数位数、管理信息和持有者。</p><p>显示余额时应使用该 Jetton 自身的小数位数，不要假设每种 Jetton 都有9位小数。<a href=\"https://docs.ton.org/contracts/standard/tokens/jettons/overview\" target=\"_blank\" rel=\"noopener noreferrer\">Jetton 标准</a>。</p>"
  ],
  "scaled-jettons": [
    "为什么 Jetton 显示余额可能与链上金额不同？",
    "<p>某些 Jetton 使用显示倍率。当前钱包余额、持有者余额和总供应量会先以精确舍入应用该比例，再应用代币的小数位数。展开“金额详情”可查看链上金额、原始单位和比例。</p><p>历史转移保留当时记录的链上数量；当前倍率不能证明当时使用的倍率。<a href=\"https://github.com/ton-blockchain/TEPs/blob/master/text/0526-scaled-ui-jettons.md\" target=\"_blank\" rel=\"noopener noreferrer\">缩放 UI Jetton 标准</a>。</p>"
  ],
  "nft-identity": [
    "什么可以标识 NFT？",
    "<p>NFT 项目的合约地址就是其标识。所属系列、所有者和项目索引是不同字段。系列成员验证检查项目与系列的关系；它不能证明图片、名称或卖家可信。</p><p>当 NFT 合约确认索引时，项目详情显示精确索引。NFT 名称中显示的编号不一定等于其链上索引。</p>"
  ],
  "nft-metadata": [
    "图片和属性来自哪里？",
    "<p>TEP-64支持链上、链下以及组合元数据。NFT 页面显示名称、描述、图片和属性，也可以展开完整元数据。托管在其他位置的媒体或元数据可能发生变化或不可用。</p><p>请从项目页面主动打开动画。媒体缺失不会删除 NFT 合约或所有权记录。<a href=\"https://github.com/ton-blockchain/TEPs/blob/master/text/0064-token-data-standard.md\" target=\"_blank\" rel=\"noopener noreferrer\">代币元数据标准</a>。</p>"
  ],
  "nft-sales": [
    "为什么 NFT 由销售合约持有？",
    "<p>上架的 NFT 可能由市场的销售合约持有。钱包 NFT 列表会包含已识别的间接销售所有权。项目页面分别显示链上所有者、卖家、销售合约和价格货币。</p><p>上架销售不等于转移已完成。请使用转移历史跟踪变化，并通过系列页面浏览其项目。</p>"
  ],
  "telegram-collectibles": [
    "所有 Telegram 礼物都能在链上看到吗？",
    "<p>不是。礼物必须作为TON NFT 存在，才能在这里具有链上项目地址和所有权记录。Telegram 礼物、收藏型用户名和号码可能有关联的TON NFT，但仅凭 Telegram 个人资料或普通用户名不能证明钱包所有权。</p><p>收藏品可能显示在 Telegram 个人资料中，但其所有者仍是TON钱包。请核对项目地址、所属系列和当前所有者。<a href=\"https://core.telegram.org/api/gifts\" target=\"_blank\" rel=\"noopener noreferrer\">Telegram 收藏型礼物</a>。</p>"
  ],
  "nft-pagination": [
    "如何查看账户或系列中的全部 NFT？",
    "<p>使用 NFT 列表下方的“加载更多”，继续浏览系列或钱包。NFT 标签会分别显示每个返回的项目，包括完整名称及其详情链接。钱包的 NFT 收藏和交易历史是互相独立的列表。</p>"
  ],
  "trust-and-identity": [
    "识别标签是什么意思？",
    "<p>系列成员关系、信任分类和市场认可属于不同事实。已识别的名称和图片不是所有权证明。在将名称相似的资产视为同一种代币之前，请比较合约地址和系列链接。</p>"
  ],
  "automatic-routing": [
    "自动路由如何工作？",
    "<p>将地址、交易哈希、消息哈希、区块编号或 .ton 名称粘贴到搜索框。自动路由会帮助查找所属链。选择原生浏览器后可继续使用该链的搜索；选择“查看中心”可返回 tx.taxi。</p>"
  ],
  "updates": [
    "“更新延迟”是什么意思？",
    "<p>新更新延迟时，页面会继续显示上次可用的数据。对不可用的部分选择重试可重新加载。空列表与不可用列表是不同状态。</p>"
  ],
  "wallet-support": [
    "tx.taxi 可以撤销交易吗？",
    "<p>tx.taxi 显示公开链上数据。它无法签署交易、访问私钥或撤销转移。有关钱包或交易所账户的支持，请联系提交该操作的服务。</p>"
  ],
  "api-values": [
    "数值与分页",
    "<p>以下所有路由均使用 GET。精度敏感的整数以十进制字符串表示；请使用任意精度运算解析。GRAM 余额和手续费以纳克为单位。Jetton 金额使用其声明的小数位数。</p><p>分页响应包含<code>_paging</code>。仅在<code>hasMore</code>为 true 时继续，针对相应端点使用<code>nextOffset</code>、<code>nextBeforeLt</code>或<code>nextBefore</code>。列表上限为100；区块列表上限为16。</p><p><code>_meta.observedAt</code>标识观察时间，<code>_meta.stale</code>标记保留的数据。HTTP 400表示输入无效，404表示未找到，503表示暂时不可用。</p>"
  ],
  "get-dashboard": [
    "网络概览",
    "<p>返回选定的工作链和分片、最近区块、观察历史、观察时间和数据延迟状态。默认使用基础链。主链使用<code>workchain=-1</code>，活跃的基础链分片使用<code>workchain=0&amp;shard=...</code>。<code>activeShards</code>列出可用分片；<code>masterchainHead</code>是网络主链的最新区块。</p>"
  ],
  "get-blocks": [
    "区块",
    "<p>按序列号降序返回一个工作链和分片中的区块。默认使用基础链；主链区块使用<code>workchain=-1</code>。使用<code>before=_paging.nextBefore</code>继续，并保留响应中的<code>workchain</code>和<code>shard</code>；边界不包含在结果中。分页在分片拆分或合并处停止。</p>"
  ],
  "get-block": [
    "区块详情",
    "<p>使用序列号或完整的<code>(workchain,shard,seqno)</code>标识符。序列号使用选定的工作链和分片；未选择时使用主机默认工作链和根分片。返回哈希、时间戳、逻辑时间、引用和值流字段。</p>"
  ],
  "get-block-transactions": [
    "区块交易",
    "<p>返回指定区块中包含的交易。</p>"
  ],
  "get-block-shards": [
    "主链分片引用",
    "<p>使用主链序列号或主链区块标识符，返回相应的分片引用。</p>"
  ],
  "get-network-transactions": [
    "网络交易",
    "<p>返回一个主链区间中跨分片的交易。在该区间内使用<code>master_seqno=_paging.masterSeqno</code>和<code>offset=_paging.nextOffset</code>继续。当<code>nextOffset</code>为 null 时，改用<code>before=_paging.nextBefore</code>继续。上限为50。</p>"
  ],
  "get-transactions": [
    "主链交易",
    "<p>返回一个主链区块中的交易。使用<code>before=_paging.nextBefore</code>继续。这些是主链交易，不是所有分片的全部交易。</p>"
  ],
  "get-validators": [
    "验证者",
    "<p>返回验证者选举信息、质押金额和验证者条目。</p>"
  ],
  "get-dns": [
    "域名详情",
    "<p>返回域名标识、到期时间和关联 NFT。附加<code>/resolve</code>可获取钱包、网站、存储和解析器记录；附加<code>/bids</code>可获取竞价历史。</p>"
  ],
  "get-auctions": [
    "DNS 拍卖",
    "<p>当前域名拍卖。选择<code>ton</code>或<code>t.me</code>。</p>"
  ],
  "get-dns-expiring": [
    "即将到期的域名",
    "<p>返回即将到期的域名。可选参数<code>period</code>表示到期前的天数。</p>"
  ],
  "get-staking-pool": [
    "质押池",
    "<p>返回池质押、提名者、周期、实现方式和年化收益率。附加<code>/history</code>可获取观察到的 APY 历史。</p>"
  ],
  "get-extra-currency": [
    "额外货币",
    "<p>返回货币 ID、符号、小数位数和图片。</p>"
  ],
  "get-extra-currency-history": [
    "额外货币历史",
    "<p>返回账户中选定货币的事件。使用<code>before_lt</code>继续。</p>"
  ],
  "get-block-boc": [
    "区块 BOC",
    "<p>将区块下载为二进制 Bag of Cells。</p>"
  ],
  "get-config-raw": [
    "原始配置",
    "<p>返回原始网络配置。添加<code>master_seqno</code>可请求历史主链配置。</p>"
  ],
  "get-config": [
    "区块链配置",
    "<p>返回解码后的区块链配置参数。添加<code>master_seqno</code>可获取历史主链配置。</p>"
  ],
  "get-rates": [
    "GRAM 汇率",
    "<p>返回 GRAM 兑 AUD、CAD、CHF、EUR、GBP、JPY 和 USD 的汇率。</p>"
  ],
  "get-transaction": [
    "交易详情",
    "<p>返回账户交易、消息、手续费、阶段和状态变化，以及可用的追踪和已解读事件详情。<code>relatedUnavailable</code>标识无法加载的相关部分。</p>"
  ],
  "get-message": [
    "通过消息哈希查找交易",
    "<p>查找与所提供消息哈希关联的交易。</p>"
  ],
  "get-trace": [
    "追踪",
    "<p>返回相关交易树，包括子追踪和执行详情。</p>"
  ],
  "resolve": [
    "解析搜索输入",
    "<p>解析TON账户、NFT、系列、Jetton、交易、消息哈希、区块标识符或 .ton 域名，返回实体类型和标识符。</p>"
  ],
  "get-account": [
    "账户详情",
    "<p>返回余额、状态、合约接口、可用的区块链状态和 DNS 名称。状态可能包含代码、数据、存储信息和额外货币。</p>"
  ],
  "get-account-transactions": [
    "账户交易",
    "<p>列出账户交易。使用<code>before_lt=_paging.nextBeforeLt</code>继续；也接受<code>after_lt</code>。</p>"
  ],
  "get-account-events": [
    "账户转移和事件",
    "<p>返回已解读的动作及其状态。使用<code>before_lt</code>继续。</p>"
  ],
  "get-account-jettons": [
    "Jetton 余额",
    "<p>返回余额、主合约元数据和账户的 Jetton 钱包地址。</p>"
  ],
  "get-account-nfts": [
    "账户 NFT",
    "<p>返回 NFT 项目，默认包含已识别的间接销售所有权。使用<code>collection</code>筛选，或使用<code>indirect_ownership=false</code>仅显示直接所有权。使用<code>offset=_paging.nextOffset</code>继续。</p>"
  ],
  "get-account-nft-history": [
    "NFT 操作",
    "<p>返回账户的 NFT 操作。使用<code>before_lt</code>继续。</p>"
  ],
  "get-account-jetton-history": [
    "Jetton 历史",
    "<p>返回账户的 Jetton 事件。使用<code>before_lt</code>继续。</p>"
  ],
  "get-inspect": [
    "合约检查",
    "<p>返回可用的合约检查详情和已识别接口。</p>"
  ],
  "get-method": [
    "读取合约方法",
    "<p>执行只读 getter。将每个参数作为重复的<code>args</code>参数提供，例如<code>?args=123&args=456</code>。参数保持为字符串，可以包含该方法接受的整数、地址或 BOC 值。</p>"
  ],
  "get-staking": [
    "质押池",
    "<p>返回账户的提名者池头寸。</p>"
  ],
  "get-multisig": [
    "多签合约",
    "<p>返回多签合约的阈值、签名者、提议者、序列号和订单。使用下方复数形式的路由查找与签名者钱包关联的多签。</p>"
  ],
  "get-multisigs": [
    "多签记录",
    "<p>返回与账户关联的多签记录。</p>"
  ],
  "get-subscriptions": [
    "订阅",
    "<p>返回账户的订阅记录。</p>"
  ],
  "get-defi": [
    "DeFi 资产",
    "<p>返回账户中已识别的 DeFi 头寸和资产。</p>"
  ],
  "get-nft": [
    "NFT 项目",
    "<p>返回项目的所有者、系列、元数据、媒体预览、信任和销售字段。<code>indexVerified</code>表示<code>index</code>是否由<code>get_nft_data</code>确认；原始索引保留在<code>indexed_index</code>中。</p>"
  ],
  "get-sbt": [
    "灵魂绑定 NFT 详情",
    "<p>对于灵魂绑定 NFT，返回其合约中的权限地址和撤销时间戳。撤销时间戳为零表示未撤销。灵魂绑定项目不可转移。</p>"
  ],
  "get-nft-history": [
    "NFT 历史",
    "<p>返回单个 NFT 的事件。使用<code>before_lt</code>继续。</p>"
  ],
  "get-collection": [
    "系列详情",
    "<p>返回系列所有者、内容、元数据和预览。当<code>indexVerified</code>为 true 时，<code>next_item_index</code>已由系列 getter 确认；它不一定是项目总数。</p>"
  ],
  "get-collection-items": [
    "系列项目",
    "<p>返回系列中的 NFT 项目。使用<code>offset=_paging.nextOffset</code>继续。</p>"
  ],
  "get-jetton": [
    "Jetton 详情",
    "<p>返回主合约元数据、总供应量、管理信息、小数位数和持有者数量。</p>"
  ],
  "get-jetton-holders": [
    "Jetton 持有者",
    "<p>在<code>addresses</code>下返回持有者条目。使用<code>offset=_paging.nextOffset</code>继续。余额使用该 Jetton 的小数位数。</p>"
  ],
  "websocket-connect": [
    "连接",
    "<p>连接同一主机的<code>/api/v1/ws</code>，并发送<code>init</code>获取当前快照。默认选择基础链区块。主链添加<code>?workchain=-1</code>，基础链分片添加<code>?workchain=0&amp;shard=...</code>。单个账户、NFT、交易和追踪请使用 REST API。</p>"
  ],
  "websocket-init": [
    "当前快照",
    "<p>响应包含选定工作链和分片的最近标准化<code>blocks</code>，以及含有最新区块、观察历史、观察时间和延迟状态的<code>ton</code>对象。<code>ton.head</code>提供所选区块的完整字段，<code>ton.masterchainHead</code>提供网络主链最新区块。发送<code>{\"action\":\"select\",\"workchain\":-1}</code>可将已打开的连接切换到主链。</p>"
  ],
  "websocket-ping": [
    "保持连接",
    "<p>发送 ping 检查连接。重新连接时再次发送<code>init</code>以获取当前快照。</p>"
  ],
  "websocket-stale": [
    "更新延迟",
    "<p>当<code>ton.stale</code>为 true 时，保留上次可用的区块并标记为延迟。<code>ton.observedAt</code>是观察时间戳。仅凭 WebSocket 连接正常不能证明数据是最新的。</p>"
  ]
};
export function translateTonDocsChinese(items: TonDocItem[], locale: string): TonDocItem[] {
  if (!locale.toLowerCase().startsWith('zh')) return items;
  return items.map(item => {
    if (item.type === 'category') return { ...item, title: categories[item.title] || item.title };
    const translated = entries[item.fragment];
    return { ...item, title: translated?.[0] || item.title, description: translated?.[1] || item.description, category: categories[item.category] || item.category };
  });
}
