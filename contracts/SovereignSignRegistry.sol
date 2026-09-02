// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title Sovereign Sign Protocol — single shared registry on Polygon
/// @notice One deployment per chain. Each stamped track is keyed by a 32-byte
///         content hash (SHA-256 of the master). Splits are immutable once set.
///         Payments are pulled by recipients (safe pattern: no per-recipient
///         re-entrancy risk and no DoS by a single bad recipient).
contract SovereignSignRegistry {
    // ─── Types ──────────────────────────────────────────────────────────────
    struct Split {
        address[] recipients;
        uint16[] sharesBps; // basis points; must sum to 10_000
    }

    // ─── Storage ────────────────────────────────────────────────────────────
    /// @notice ERC-20 used to settle royalties. Set once at construction
    ///         (USDC on Polygon = 0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359).
    address public immutable token;

    mapping(bytes32 => Split) private _splits;
    mapping(bytes32 => address) public stamper;          // first caller wins, immutable
    mapping(bytes32 => uint64) public stampedAt;         // block.timestamp at stamp
    mapping(address => uint256) public balances;         // pull-pattern balance

    uint256 public totalStamps;
    uint256 public totalVolume;                          // lifetime token paid

    // ─── Events ─────────────────────────────────────────────────────────────
    event Stamped(
        bytes32 indexed trackHash,
        address indexed stamper,
        address[] recipients,
        uint16[] sharesBps,
        uint64 timestamp
    );
    event Paid(
        bytes32 indexed trackHash,
        address indexed payer,
        uint256 amount,
        uint64 timestamp
    );
    event Credited(
        bytes32 indexed trackHash,
        address indexed recipient,
        uint256 amount
    );
    event Withdrawn(address indexed recipient, uint256 amount);

    // ─── Errors ─────────────────────────────────────────────────────────────
    error AlreadyStamped();
    error NotStamped();
    error InvalidSplit();
    error TransferFailed();
    error NothingToWithdraw();
    error Reentrancy();

    // ─── Reentrancy guard (manual to avoid OZ dependency at deploy time) ────
    uint256 private _lock = 1;
    modifier nonReentrant() {
        if (_lock == 2) revert Reentrancy();
        _lock = 2;
        _;
        _lock = 1;
    }

    constructor(address _token) {
        require(_token != address(0), "token=0");
        token = _token;
    }

    // ─── Stamping ───────────────────────────────────────────────────────────
    /// @notice Register an immutable split for a master track hash.
    /// @param trackHash SHA-256 of the master (any 32-byte identifier).
    /// @param recipients Royalty recipients.
    /// @param sharesBps Per-recipient share in basis points; must sum to 10000.
    function stamp(
        bytes32 trackHash,
        address[] calldata recipients,
        uint16[] calldata sharesBps
    ) external {
        if (stamper[trackHash] != address(0)) revert AlreadyStamped();
        uint256 n = recipients.length;
        if (n == 0 || n != sharesBps.length || n > 64) revert InvalidSplit();

        uint256 sum;
        for (uint256 i = 0; i < n; i++) {
            if (recipients[i] == address(0) || sharesBps[i] == 0) revert InvalidSplit();
            sum += sharesBps[i];
        }
        if (sum != 10_000) revert InvalidSplit();

        _splits[trackHash] = Split({recipients: recipients, sharesBps: sharesBps});
        stamper[trackHash] = msg.sender;
        stampedAt[trackHash] = uint64(block.timestamp);
        totalStamps += 1;

        emit Stamped(trackHash, msg.sender, recipients, sharesBps, uint64(block.timestamp));
    }

    // ─── Payment ────────────────────────────────────────────────────────────
    /// @notice Pay royalties for a stamped track. Pulls `amount` of `token`
    ///         from the caller and credits recipient balances by share.
    /// @dev Caller must `approve(registry, amount)` on the token first.
    function pay(bytes32 trackHash, uint256 amount) external nonReentrant {
        if (stamper[trackHash] == address(0)) revert NotStamped();
        if (amount == 0) revert InvalidSplit();

        // Pull tokens
        _safeTransferFrom(msg.sender, address(this), amount);

        // Credit recipients
        Split storage s = _splits[trackHash];
        uint256 distributed;
        uint256 n = s.recipients.length;
        for (uint256 i = 0; i < n; i++) {
            uint256 share = i == n - 1
                ? amount - distributed                     // last recipient gets dust
                : (amount * s.sharesBps[i]) / 10_000;
            distributed += share;
            balances[s.recipients[i]] += share;
            emit Credited(trackHash, s.recipients[i], share);
        }
        totalVolume += amount;
        emit Paid(trackHash, msg.sender, amount, uint64(block.timestamp));
    }

    // ─── Withdraw ───────────────────────────────────────────────────────────
    function withdraw() external nonReentrant {
        uint256 owed = balances[msg.sender];
        if (owed == 0) revert NothingToWithdraw();
        balances[msg.sender] = 0;
        _safeTransfer(msg.sender, owed);
        emit Withdrawn(msg.sender, owed);
    }

    // ─── Views ──────────────────────────────────────────────────────────────
    function getSplit(bytes32 trackHash)
        external
        view
        returns (address[] memory recipients, uint16[] memory sharesBps)
    {
        Split storage s = _splits[trackHash];
        return (s.recipients, s.sharesBps);
    }

    function isStamped(bytes32 trackHash) external view returns (bool) {
        return stamper[trackHash] != address(0);
    }

    // ─── ERC-20 helpers (no SafeERC20 to keep deploy size minimal) ─────────
    function _safeTransfer(address to, uint256 amount) private {
        (bool ok, bytes memory ret) = token.call(
            abi.encodeWithSelector(0xa9059cbb, to, amount) // transfer(address,uint256)
        );
        if (!ok || (ret.length > 0 && !abi.decode(ret, (bool)))) revert TransferFailed();
    }

    function _safeTransferFrom(address from, address to, uint256 amount) private {
        (bool ok, bytes memory ret) = token.call(
            abi.encodeWithSelector(0x23b872dd, from, to, amount) // transferFrom(address,address,uint256)
        );
        if (!ok || (ret.length > 0 && !abi.decode(ret, (bool)))) revert TransferFailed();
    }
}
