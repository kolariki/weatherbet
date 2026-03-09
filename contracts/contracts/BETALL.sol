// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title BetAll Token (BETALL)
 * @notice ERC-20 token for the WeatherBet prediction market on Base.
 *         - Initial supply: 0 (all tokens minted through gameplay)
 *         - GAME_MINTER role can mint (when users win) and burn (when users bet)
 *         - Owner manages GAME_MINTER addresses
 *         - Users can self-burn via ERC20Burnable
 */
contract BETALL is ERC20, ERC20Burnable, Ownable {
    /// @notice Addresses authorized to mint and burn on behalf of the game server.
    mapping(address => bool) public gameMinters;

    event GameMinterSet(address indexed account, bool authorized);
    event GameMint(address indexed to, uint256 amount);
    event GameBurn(address indexed from, uint256 amount);

    modifier onlyGameMinter() {
        require(gameMinters[msg.sender], "BETALL: caller is not a game minter");
        _;
    }

    constructor(address initialOwner) ERC20("BetAll Token", "BETALL") Ownable(initialOwner) {}

    // ─── Admin ───────────────────────────────────────────────────────────

    /// @notice Grant or revoke GAME_MINTER role.
    function setGameMinter(address account, bool authorized) external onlyOwner {
        gameMinters[account] = authorized;
        emit GameMinterSet(account, authorized);
    }

    // ─── Game Operations ─────────────────────────────────────────────────

    /// @notice Mint tokens to a player (e.g. on win / reward).
    function gameMint(address to, uint256 amount) external onlyGameMinter {
        _mint(to, amount);
        emit GameMint(to, amount);
    }

    /// @notice Burn tokens from a player who approved the game server (e.g. on bet).
    ///         Requires prior ERC-20 approval from `from` to `msg.sender`.
    function gameBurn(address from, uint256 amount) external onlyGameMinter {
        _spendAllowance(from, msg.sender, amount);
        _burn(from, amount);
        emit GameBurn(from, amount);
    }
}
