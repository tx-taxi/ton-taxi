import { TonDocItem } from './ton-docs-data';

// Source-fingerprinted translations; endpoints and examples remain unchanged.
const categories: Record<string, string> = {
  "TON basics": "Kiến thức cơ bản về TON",
  "Wallets and contracts": "Ví và hợp đồng",
  "Jettons and NFTs": "Jetton và NFT",
  "Using tx.taxi": "Sử dụng tx.taxi",
  "Conventions": "Quy ước",
  "Network and blocks": "Mạng và khối",
  "Transactions and messages": "Giao dịch và tin nhắn",
  "Accounts and contracts": "Tài khoản và hợp đồng",
  "NFTs and jettons": "NFT và jetton",
  "Live block updates": "Cập nhật khối trực tiếp",
  "Network": "Mạng",
  "Transactions": "Giao dịch",
  "Accounts": "Tài khoản",
  "Contracts": "Hợp đồng",
  "Jettons": "Jetton",
  "NFTs": "NFT",
  "Collectibles": "Vật phẩm sưu tầm",
  "Assets": "Tài sản",
  "Search": "Tìm kiếm",
  "Live data": "Dữ liệu trực tiếp",
  "Support": "Hỗ trợ",
  "Reference": "Tham khảo",
  "Blocks": "Khối",
  "Messages": "Tin nhắn",
  "Connection": "Kết nối",
  "State": "Trạng thái"
};
const entries: Record<string, [string, string]> = {
  "masterchain-and-shards": [
    "Khối masterchain và shard có ý nghĩa gì?",
    "<p>Masterchain lưu cấu hình toàn mạng và tham chiếu trạng thái của các shardchain. Phần lớn tài khoản người dùng nằm trên basechain, có thể được chia thành các shard. Một khối được xác định bởi cả workchain, shard và số thứ tự; riêng số thứ tự không phải là chiều cao khối trên toàn mạng.</p><p>Dải trên cùng hiển thị các khối basechain. Mở menu tìm kiếm và chọn Masterchain trong mục SELECTED để xem các khối masterchain. Chọn một shard khi có nhiều shard đang hoạt động. Mở một khối để xem các giao dịch của nó; các khối masterchain cũng liên kết đến những shard mà chúng tham chiếu.</p>"
  ],
  "transactions-and-messages": [
    "Giao dịch, thông điệp và trace liên quan với nhau như thế nào?",
    "<p>Một giao dịch ghi lại việc một tài khoản xử lý một thông điệp hoặc một thao tác hệ thống. Thông điệp kết nối các tài khoản; việc xử lý thông điệp đến có thể tạo ra thông điệp đi và các giao dịch tiếp theo. Trace theo dõi những giao dịch liên kết này.</p><p>Dùng trang giao dịch để xem quá trình thực thi cục bộ, thông điệp để xem việc chuyển giữa các hợp đồng, và trace để xem toàn bộ thao tác. <a href=\"https://docs.ton.org/start-here\" target=\"_blank\" rel=\"noopener noreferrer\">Kiến thức cơ bản về TON</a>.</p>"
  ],
  "logical-time": [
    "Thời gian logic là gì?",
    "<p>Thời gian logic (LT) xác định thứ tự giao dịch và thông điệp. Nó khác với dấu thời gian Unix được hiển thị làm ngày giao dịch. Lịch sử tài khoản dùng LT làm con trỏ phân trang; hãy giữ giá trị đó dưới dạng chuỗi số nguyên chính xác.</p>"
  ],
  "fees-and-phases": [
    "Phí đã được dùng vào đâu?",
    "<p>Quá trình thực thi có thể gồm các giai đoạn lưu trữ, ghi có, tính toán, hành động và hoàn trả. Trang giao dịch hiển thị tổng phí và chi tiết các giai đoạn đã ghi nhận, bao gồm lượng gas sử dụng, chi phí chuyển tiếp và mã thoát. Một thao tác thất bại vẫn có thể phải trả phí.</p><p>GRAM là đơn vị tiền gốc của TON và sử dụng 9 chữ số thập phân: 1 GRAM = 1,000,000,000 nanogram. Giá trị thông điệp và phí giao dịch là hai khoản khác nhau.</p>"
  ],
  "bounce-and-failure": [
    "Thông điệp bị hoàn trả hoặc thực thi thất bại nghĩa là gì?",
    "<p>Một thông điệp bị hoàn trả sẽ tạo phản hồi khi thông điệp cho phép hoàn trả không thể được xử lý theo các quy tắc áp dụng. Đây là một thông điệp riêng với giá trị và chi phí riêng. Hãy xem kết quả giao dịch, kết quả tính toán và hành động cùng với các thông điệp đi.</p><p>Một giao dịch đã được xác nhận vẫn có thể thực thi thất bại. Một giao dịch thành công cũng không chứng minh rằng mọi giao dịch sau đó trong trace đều thành công. <a href=\"https://docs.ton.org/resources/pdfs/tblkch.pdf\" target=\"_blank\" rel=\"noopener noreferrer\">Đặc tả blockchain TON</a>.</p>"
  ],
  "confirmation": [
    "Được xác nhận có đồng nghĩa với thao tác đã hoàn tất không?",
    "<p>Được xác nhận có nghĩa là giao dịch đã được đưa vào khối. Một thao tác liên quan đến nhiều hợp đồng có thể gồm thêm các giao dịch và thông điệp khác. Hãy kiểm tra toàn bộ trace và người nhận cuối cùng, thay vì coi giao dịch đầu tiên là toàn bộ lần chuyển.</p>"
  ],
  "wallets-and-state": [
    "Trang tài khoản hiển thị những gì?",
    "<p>Trang tài khoản hiển thị số dư GRAM, trạng thái, hoạt động gần nhất và các giao diện hợp đồng được phát hiện. Lịch sử nhóm các hành động được nhận diện; Giao dịch liệt kê các giao dịch của tài khoản. Jetton và NFT có các thẻ riêng.</p><p>Thẻ Hợp đồng chứa trạng thái, mã và dữ liệu, các phương thức chỉ đọc cùng những bản ghi staking, multisig, đăng ký và DeFi hiện có. Mở rộng Chi tiết tài khoản để xem thêm các trường và tiền tệ bổ sung.</p>"
  ],
  "addresses-and-dns": [
    "Vì sao cùng một tài khoản có thể có nhiều địa chỉ?",
    "<p>Tài khoản TON có thể được biểu diễn bằng workchain và ID tài khoản hệ thập lục phân ở dạng thô hoặc bằng địa chỉ thân thiện với người dùng. Cờ cho phép hoàn trả và cờ mạng có thể thay đổi cách biểu diễn địa chỉ thân thiện mà không làm thay đổi tài khoản gốc.</p><p>Tìm kiếm chấp nhận địa chỉ TON và tên .ton. Phân giải DNS liên kết tới tài khoản đã được phân giải; tên miền không thay thế việc kiểm tra địa chỉ tài khoản.</p>"
  ],
  "contract-methods": [
    "Tôi có thể đọc hợp đồng thông minh không?",
    "<p>Chọn một getter trong thẻ Hợp đồng và cung cấp đối số khi cần. Thao tác đọc trả về kết quả mà không cần ký giao dịch. Đối số có thể là các chuỗi phân cách bằng dấu phẩy hoặc một mảng chuỗi JSON; hãy giữ các số nguyên lớn dưới dạng chuỗi.</p><p>Chi tiết tài khoản lưu các trường mã, dữ liệu và lưu trữ. Phần kiểm tra hiển thị các giao diện được nhận diện và thông tin trình biên dịch hiện có.</p>"
  ],
  "validators": [
    "Trang validator hiển thị những gì?",
    "<p>Trang validator hiển thị thời điểm bầu chọn, tổng mức stake và mức stake tối thiểu, cùng các tài khoản validator tham gia, mức stake và địa chỉ ADNL. Những trường này mô tả dữ liệu bầu chọn được hiển thị; một địa chỉ nắm giữ stake không tự động là bên tạo ra một khối cụ thể.</p>"
  ],
  "jettons": [
    "Jetton hoạt động như thế nào?",
    "<p>Một jetton có hợp đồng master và các hợp đồng ví jetton riêng cho từng người nắm giữ. Hãy xác định jetton bằng địa chỉ master, không phải tên hoặc ký hiệu. Trang jetton hiển thị nguồn cung, số chữ số thập phân, thông tin quản trị và người nắm giữ.</p><p>Hiển thị số dư theo số chữ số thập phân của chính jetton đó. Đừng cho rằng mọi jetton đều có 9 chữ số thập phân. <a href=\"https://docs.ton.org/contracts/standard/tokens/jettons/overview\" target=\"_blank\" rel=\"noopener noreferrer\">Tiêu chuẩn jetton</a>.</p>"
  ],
  "scaled-jettons": [
    "Vì sao số dư jetton hiển thị có thể khác lượng trên chuỗi?",
    "<p>Một số jetton dùng hệ số nhân để hiển thị. Số dư ví hiện tại, số dư của người nắm giữ và tổng nguồn cung áp dụng tỷ lệ đó với phép làm tròn chính xác, sau đó áp dụng số chữ số thập phân của token. Mở rộng Chi tiết số lượng để xem lượng trên chuỗi, đơn vị thô và tỷ lệ.</p><p>Các lần chuyển trong lịch sử giữ nguyên số lượng trên chuỗi đã ghi nhận; hệ số hiện tại không chứng minh hệ số tại thời điểm đó. <a href=\"https://github.com/ton-blockchain/TEPs/blob/master/text/0526-scaled-ui-jettons.md\" target=\"_blank\" rel=\"noopener noreferrer\">Tiêu chuẩn jetton có giao diện điều chỉnh theo tỷ lệ</a>.</p>"
  ],
  "nft-identity": [
    "Điều gì xác định một NFT?",
    "<p>Địa chỉ hợp đồng của NFT là định danh của NFT đó. Bộ sưu tập, chủ sở hữu và chỉ số vật phẩm là các trường riêng biệt. Việc xác minh vật phẩm thuộc bộ sưu tập chỉ kiểm tra mối quan hệ với bộ sưu tập; nó không chứng minh hình ảnh, tên hoặc người bán đáng tin cậy.</p><p>Chi tiết vật phẩm hiển thị chỉ số chính xác khi được hợp đồng NFT xác nhận. Con số hiển thị trong tên NFT không nhất thiết trùng với chỉ số trên chuỗi.</p>"
  ],
  "nft-metadata": [
    "Hình ảnh và thuộc tính đến từ đâu?",
    "<p>TEP-64 hỗ trợ siêu dữ liệu trên chuỗi, ngoài chuỗi và kết hợp. Trang NFT hiển thị tên, mô tả, hình ảnh và thuộc tính; toàn bộ siêu dữ liệu có thể được mở rộng để xem. Nội dung hoặc siêu dữ liệu được lưu ở nơi khác có thể thay đổi hoặc không còn khả dụng.</p><p>Hãy chủ động mở nội dung động từ trang vật phẩm. Việc thiếu nội dung không xóa hợp đồng hay bản ghi quyền sở hữu NFT. <a href=\"https://github.com/ton-blockchain/TEPs/blob/master/text/0064-token-data-standard.md\" target=\"_blank\" rel=\"noopener noreferrer\">Tiêu chuẩn siêu dữ liệu token</a>.</p>"
  ],
  "nft-sales": [
    "Vì sao một NFT thuộc sở hữu của hợp đồng bán?",
    "<p>NFT được niêm yết có thể do hợp đồng bán của sàn nắm giữ. Danh sách NFT trong ví bao gồm quyền sở hữu gián tiếp qua hợp đồng bán được nhận diện. Trang vật phẩm phân biệt chủ sở hữu trên chuỗi, người bán, hợp đồng bán và loại tiền định giá.</p><p>Việc niêm yết bán không phải là một lần chuyển đã hoàn tất. Dùng lịch sử chuyển để theo dõi thay đổi và trang bộ sưu tập để xem các vật phẩm.</p>"
  ],
  "telegram-collectibles": [
    "Tất cả quà Telegram có hiển thị trên chuỗi không?",
    "<p>Không. Một món quà phải tồn tại dưới dạng NFT TON thì mới có địa chỉ vật phẩm và bản ghi sở hữu trên chuỗi tại đây. Quà Telegram, tên người dùng và số có thể sưu tầm có thể có NFT TON liên quan, nhưng chỉ một hồ sơ Telegram hoặc tên người dùng thông thường không chứng minh quyền sở hữu ví.</p><p>Một vật phẩm sưu tầm có thể hiển thị trên hồ sơ Telegram trong khi chủ sở hữu vẫn là một ví TON. Hãy kiểm tra địa chỉ vật phẩm, bộ sưu tập và chủ sở hữu hiện tại. <a href=\"https://core.telegram.org/api/gifts\" target=\"_blank\" rel=\"noopener noreferrer\">Quà tặng sưu tầm Telegram</a>.</p>"
  ],
  "nft-pagination": [
    "Làm thế nào để xem tất cả NFT trong tài khoản hoặc bộ sưu tập?",
    "<p>Dùng Tải thêm bên dưới danh sách NFT để xem tiếp bộ sưu tập hoặc ví. Thẻ NFT bao gồm từng vật phẩm được trả về riêng biệt, với tên đầy đủ và liên kết đến chi tiết vật phẩm. Bộ sưu tập NFT của ví và lịch sử giao dịch của ví là hai danh sách độc lập.</p>"
  ],
  "trust-and-identity": [
    "Các nhãn nhận diện có nghĩa là gì?",
    "<p>Việc thuộc bộ sưu tập, phân loại độ tin cậy và phê duyệt của sàn giao dịch là những thông tin khác nhau. Tên và hình ảnh được nhận diện không phải bằng chứng sở hữu. Hãy so sánh địa chỉ hợp đồng và liên kết bộ sưu tập trước khi coi hai tài sản có tên tương tự là cùng một token.</p>"
  ],
  "automatic-routing": [
    "Định tuyến tự động hoạt động như thế nào?",
    "<p>Dán địa chỉ, mã băm giao dịch, mã băm thông điệp, số khối hoặc tên .ton vào ô tìm kiếm. Định tuyến tự động cho phép taxi tìm chuỗi tương ứng. Chọn một trình khám phá gốc để tiếp tục tìm kiếm trên chuỗi đó; Xem Hub đưa bạn trở lại tx.taxi.</p>"
  ],
  "updates": [
    "Cập nhật bị chậm nghĩa là gì?",
    "<p>Dữ liệu khả dụng gần nhất vẫn được hiển thị khi cập nhật mới bị chậm. Thử lại mục không khả dụng để tải lại. Danh sách rỗng và danh sách không khả dụng là hai trạng thái khác nhau.</p>"
  ],
  "wallet-support": [
    "tx.taxi có thể đảo ngược giao dịch không?",
    "<p>tx.taxi hiển thị dữ liệu chuỗi công khai. Dịch vụ không thể ký giao dịch, truy cập khóa riêng hay đảo ngược một lần chuyển. Để được hỗ trợ về ví hoặc tài khoản sàn, hãy liên hệ dịch vụ đã gửi thao tác đó.</p>"
  ],
  "api-values": [
    "Giá trị và phân trang",
    "<p>Tất cả các tuyến dưới đây dùng GET. Những số nguyên cần độ chính xác được biểu diễn bằng chuỗi thập phân; hãy phân tích chúng bằng phép toán độ chính xác tùy ý. Số dư và phí GRAM tính bằng nanogram. Số lượng jetton dùng số chữ số thập phân đã khai báo của chúng.</p><p>Phản hồi phân trang chứa <code>_paging</code>. Chỉ tiếp tục khi <code>hasMore</code> là true, dùng <code>nextOffset</code>, <code>nextBeforeLt</code> hoặc <code>nextBefore</code> cho endpoint tương ứng. Giới hạn danh sách tối đa là 100; danh sách khối là 16.</p><p><code>_meta.observedAt</code> cho biết thời điểm quan sát và <code>_meta.stale</code> đánh dấu dữ liệu được giữ lại. HTTP 400 là đầu vào không hợp lệ, 404 là không tìm thấy và 503 là tạm thời không khả dụng.</p>"
  ],
  "get-dashboard": [
    "Tổng quan mạng",
    "<p>Trả về workchain và shard đã chọn, các khối gần đây, lịch sử đã quan sát, thời điểm quan sát và trạng thái dữ liệu cũ. Mặc định là basechain. Dùng <code>workchain=-1</code> cho masterchain hoặc <code>workchain=0&amp;shard=...</code> cho một shard basechain đang hoạt động. <code>activeShards</code> liệt kê các shard khả dụng; <code>masterchainHead</code> là khối đầu masterchain của mạng.</p>"
  ],
  "get-blocks": [
    "Các khối",
    "<p>Trả về các khối của một workchain và shard theo thứ tự số thứ tự giảm dần. Mặc định là basechain; dùng <code>workchain=-1</code> cho các khối masterchain. Tiếp tục với <code>before=_paging.nextBefore</code> và giữ <code>workchain</code> cùng <code>shard</code> từ phản hồi; giá trị ranh giới không được bao gồm. Phân trang dừng tại điểm shard tách hoặc gộp.</p>"
  ],
  "get-block": [
    "Chi tiết khối",
    "<p>Dùng số thứ tự hoặc định danh đầy đủ <code>(workchain,shard,seqno)</code>. Số thứ tự sử dụng workchain và shard đã chọn; nếu không chọn, nó dùng workchain mặc định của host và shard gốc. Trả về mã băm, dấu thời gian, thời gian logic, tham chiếu và các trường luồng giá trị.</p>"
  ],
  "get-block-transactions": [
    "Giao dịch trong khối",
    "<p>Trả về các giao dịch có trong khối được chỉ định.</p>"
  ],
  "get-block-shards": [
    "Tham chiếu shard của masterchain",
    "<p>Dùng số thứ tự masterchain hoặc định danh khối masterchain. Trả về các tham chiếu shard tương ứng.</p>"
  ],
  "get-network-transactions": [
    "Giao dịch trên mạng",
    "<p>Trả về các giao dịch trên các shard trong một khoảng masterchain. Tiếp tục trong khoảng đó bằng <code>master_seqno=_paging.masterSeqno</code> và <code>offset=_paging.nextOffset</code>. Khi <code>nextOffset</code> là null, hãy tiếp tục bằng <code>before=_paging.nextBefore</code>. Giới hạn tối đa là 50.</p>"
  ],
  "get-transactions": [
    "Giao dịch masterchain",
    "<p>Trả về các giao dịch từ một khối masterchain. Tiếp tục bằng <code>before=_paging.nextBefore</code>. Đây là các giao dịch masterchain, không phải mọi giao dịch trên tất cả các shard.</p>"
  ],
  "get-validators": [
    "Validator",
    "<p>Trả về thông tin bầu chọn validator, mức stake và danh sách validator.</p>"
  ],
  "get-dns": [
    "Chi tiết tên miền",
    "<p>Định danh tên miền, thời hạn hết hiệu lực và NFT liên kết. Thêm <code>/resolve</code> để lấy bản ghi ví, trang web, lưu trữ và trình phân giải, hoặc <code>/bids</code> để xem lịch sử đặt giá.</p>"
  ],
  "get-auctions": [
    "Đấu giá DNS",
    "<p>Các phiên đấu giá tên miền hiện tại. Chọn <code>ton</code> hoặc <code>t.me</code>.</p>"
  ],
  "get-dns-expiring": [
    "Tên miền sắp hết hạn",
    "<p>Trả về các tên miền sắp hết hạn. Tham số tùy chọn <code>period</code> là số ngày trước khi hết hạn.</p>"
  ],
  "get-staking-pool": [
    "Pool staking",
    "<p>Mức stake của pool, các nominator, chu kỳ, kiểu triển khai và lợi suất phần trăm hằng năm. Thêm <code>/history</code> để xem lịch sử APY đã quan sát.</p>"
  ],
  "get-extra-currency": [
    "Tiền tệ bổ sung",
    "<p>ID tiền tệ, ký hiệu, số chữ số thập phân và hình ảnh.</p>"
  ],
  "get-extra-currency-history": [
    "Lịch sử tiền tệ bổ sung",
    "<p>Các sự kiện tài khoản cho loại tiền được chọn. Tiếp tục với <code>before_lt</code>.</p>"
  ],
  "get-block-boc": [
    "BOC của khối",
    "<p>Tải khối dưới dạng Bag of Cells nhị phân.</p>"
  ],
  "get-config-raw": [
    "Cấu hình thô",
    "<p>Cấu hình mạng ở dạng thô. Thêm <code>master_seqno</code> để yêu cầu cấu hình masterchain trong quá khứ.</p>"
  ],
  "get-config": [
    "Cấu hình blockchain",
    "<p>Trả về các tham số cấu hình blockchain đã giải mã. Thêm <code>master_seqno</code> để xem cấu hình masterchain trong quá khứ.</p>"
  ],
  "get-rates": [
    "Tỷ giá GRAM",
    "<p>Trả về tỷ giá GRAM theo AUD, CAD, CHF, EUR, GBP, JPY và USD.</p>"
  ],
  "get-transaction": [
    "Chi tiết giao dịch",
    "<p>Trả về giao dịch của tài khoản, thông điệp, phí, các giai đoạn và thay đổi trạng thái, cùng trace và chi tiết sự kiện đã diễn giải nếu có. <code>relatedUnavailable</code> xác định những mục liên quan không thể tải.</p>"
  ],
  "get-message": [
    "Giao dịch theo mã băm thông điệp",
    "<p>Tìm giao dịch gắn với mã băm thông điệp được cung cấp.</p>"
  ],
  "get-trace": [
    "Dấu vết giao dịch",
    "<p>Trả về cây giao dịch liên kết cùng các trace con và chi tiết thực thi.</p>"
  ],
  "resolve": [
    "Phân giải nội dung tìm kiếm",
    "<p>Phân giải tài khoản TON, NFT, bộ sưu tập, jetton, giao dịch, mã băm thông điệp, định danh khối hoặc tên miền .ton. Trả về loại thực thể và định danh.</p>"
  ],
  "get-account": [
    "Chi tiết tài khoản",
    "<p>Trả về số dư, trạng thái, giao diện hợp đồng, trạng thái blockchain hiện có và tên DNS. Trạng thái có thể gồm mã, dữ liệu, thông tin lưu trữ và tiền tệ bổ sung.</p>"
  ],
  "get-account-transactions": [
    "Giao dịch tài khoản",
    "<p>Liệt kê các giao dịch của tài khoản. Tiếp tục với <code>before_lt=_paging.nextBeforeLt</code>; cũng chấp nhận <code>after_lt</code>.</p>"
  ],
  "get-account-events": [
    "Chuyển khoản và sự kiện tài khoản",
    "<p>Trả về các hành động đã diễn giải và trạng thái của chúng. Tiếp tục với <code>before_lt</code>.</p>"
  ],
  "get-account-jettons": [
    "Số dư jetton",
    "<p>Trả về số dư cùng siêu dữ liệu hợp đồng master và địa chỉ ví jetton của tài khoản.</p>"
  ],
  "get-account-nfts": [
    "NFT của tài khoản",
    "<p>Trả về các vật phẩm NFT, mặc định bao gồm quyền sở hữu gián tiếp qua hợp đồng bán được nhận diện. Lọc bằng <code>collection</code>, hoặc dùng <code>indirect_ownership=false</code> để chỉ lấy quyền sở hữu trực tiếp. Tiếp tục với <code>offset=_paging.nextOffset</code>.</p>"
  ],
  "get-account-nft-history": [
    "Thao tác NFT",
    "<p>Trả về các thao tác NFT của tài khoản. Tiếp tục với <code>before_lt</code>.</p>"
  ],
  "get-account-jetton-history": [
    "Lịch sử jetton",
    "<p>Trả về các sự kiện jetton của tài khoản. Tiếp tục với <code>before_lt</code>.</p>"
  ],
  "get-inspect": [
    "Kiểm tra hợp đồng",
    "<p>Trả về chi tiết kiểm tra hợp đồng hiện có và các giao diện được nhận diện.</p>"
  ],
  "get-method": [
    "Đọc phương thức hợp đồng",
    "<p>Thực thi một getter chỉ đọc. Cung cấp từng đối số bằng tham số <code>args</code> lặp lại, ví dụ <code>?args=123&args=456</code>. Các đối số vẫn là chuỗi và có thể chứa giá trị số nguyên, địa chỉ hoặc BOC được phương thức chấp nhận.</p>"
  ],
  "get-staking": [
    "Các pool staking",
    "<p>Trả về các vị thế của tài khoản trong pool nominator.</p>"
  ],
  "get-multisig": [
    "Hợp đồng multisig",
    "<p>Trả về ngưỡng, người ký, người đề xuất, số thứ tự và các lệnh của hợp đồng multisig. Dùng tuyến số nhiều bên dưới để tìm các multisig liên quan đến ví của người ký.</p>"
  ],
  "get-multisigs": [
    "Bản ghi multisig",
    "<p>Trả về các bản ghi multisig liên quan đến tài khoản.</p>"
  ],
  "get-subscriptions": [
    "Đăng ký",
    "<p>Trả về các bản ghi đăng ký của tài khoản.</p>"
  ],
  "get-defi": [
    "Tài sản DeFi",
    "<p>Trả về các vị thế và tài sản DeFi được nhận diện của tài khoản.</p>"
  ],
  "get-nft": [
    "Vật phẩm NFT",
    "<p>Trả về chủ sở hữu, bộ sưu tập, siêu dữ liệu, bản xem trước nội dung, độ tin cậy và các trường bán của vật phẩm. <code>indexVerified</code> cho biết <code>index</code> đã được <code>get_nft_data</code> xác nhận hay chưa; chỉ số gốc vẫn nằm trong <code>indexed_index</code>.</p>"
  ],
  "get-sbt": [
    "Chi tiết NFT soulbound",
    "<p>Đối với NFT soulbound, trả về địa chỉ cơ quan có thẩm quyền và dấu thời gian thu hồi từ hợp đồng. Dấu thời gian thu hồi bằng không nghĩa là chưa bị thu hồi. Vật phẩm soulbound không thể chuyển nhượng.</p>"
  ],
  "get-nft-history": [
    "Lịch sử NFT",
    "<p>Trả về các sự kiện của một NFT. Tiếp tục với <code>before_lt</code>.</p>"
  ],
  "get-collection": [
    "Chi tiết bộ sưu tập",
    "<p>Trả về chủ sở hữu, nội dung, siêu dữ liệu và bản xem trước của bộ sưu tập. Khi <code>indexVerified</code> là true, <code>next_item_index</code> đã được getter của bộ sưu tập xác nhận; giá trị này không nhất thiết là tổng số vật phẩm.</p>"
  ],
  "get-collection-items": [
    "Vật phẩm trong bộ sưu tập",
    "<p>Trả về các vật phẩm NFT của một bộ sưu tập. Tiếp tục với <code>offset=_paging.nextOffset</code>.</p>"
  ],
  "get-jetton": [
    "Chi tiết jetton",
    "<p>Trả về siêu dữ liệu hợp đồng master, tổng nguồn cung, thông tin quản trị, số chữ số thập phân và số người nắm giữ.</p>"
  ],
  "get-jetton-holders": [
    "Người nắm giữ jetton",
    "<p>Trả về danh sách người nắm giữ trong <code>addresses</code>. Tiếp tục với <code>offset=_paging.nextOffset</code>. Giá trị số dư dùng số chữ số thập phân của jetton.</p>"
  ],
  "websocket-connect": [
    "Kết nối",
    "<p>Kết nối tới cùng host tại <code>/api/v1/ws</code> và gửi <code>init</code> để nhận snapshot hiện tại. Các khối basechain được chọn mặc định. Thêm <code>?workchain=-1</code> cho masterchain hoặc <code>?workchain=0&amp;shard=...</code> cho một shard basechain. Dùng REST API để xem từng tài khoản, NFT, giao dịch và trace.</p>"
  ],
  "websocket-init": [
    "Snapshot hiện tại",
    "<p>Phản hồi bao gồm các <code>blocks</code> gần đây đã chuẩn hóa từ workchain và shard được chọn, cùng đối tượng <code>ton</code> chứa khối đầu, lịch sử đã quan sát, thời điểm quan sát và trạng thái dữ liệu cũ. Dùng <code>ton.head</code> để lấy đầy đủ các trường của khối đầu được chọn và <code>ton.masterchainHead</code> cho khối đầu masterchain của mạng. Gửi <code>{\"action\":\"select\",\"workchain\":-1}</code> để chuyển kết nối đang mở sang masterchain.</p>"
  ],
  "websocket-ping": [
    "Duy trì kết nối",
    "<p>Gửi ping để kiểm tra kết nối. Khi kết nối lại, gửi <code>init</code> lần nữa để nhận snapshot hiện tại.</p>"
  ],
  "websocket-stale": [
    "Cập nhật bị chậm",
    "<p>Khi <code>ton.stale</code> là true, hãy giữ lại các khối khả dụng gần nhất và đánh dấu chúng là bị chậm. <code>ton.observedAt</code> là dấu thời gian quan sát. Chỉ tình trạng kết nối WebSocket không đủ để xác định dữ liệu có mới hay không.</p>"
  ]
};
export function translateTonDocsVietnamese(items: TonDocItem[], locale: string): TonDocItem[] {
  if (!locale.toLowerCase().startsWith('vi')) return items;
  return items.map(item => {
    if (item.type === 'category') return { ...item, title: categories[item.title] || item.title };
    const translated = entries[item.fragment];
    return { ...item, title: translated?.[0] || item.title, description: translated?.[1] || item.description, category: categories[item.category] || item.category };
  });
}
