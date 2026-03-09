const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying BETALL with account:", deployer.address);
  console.log("Balance:", hre.ethers.formatEther(await hre.ethers.provider.getBalance(deployer.address)), "ETH");

  const BETALL = await hre.ethers.getContractFactory("BETALL");
  const betall = await BETALL.deploy(deployer.address);
  await betall.waitForDeployment();
  const address = await betall.getAddress();
  console.log("BETALL deployed to:", address);

  // Grant deployer the GAME_MINTER role (you can change this later)
  const tx = await betall.setGameMinter(deployer.address, true);
  await tx.wait();
  console.log("Game minter role granted to deployer:", deployer.address);

  console.log("\n--- Add to your .env ---");
  console.log(`BETALL_CONTRACT_ADDRESS=${address}`);

  // Verify on Basescan (may fail if API key not set)
  if (hre.network.name !== "hardhat" && hre.network.name !== "localhost") {
    console.log("\nWaiting 30s for block confirmations before verification...");
    await new Promise(r => setTimeout(r, 30000));
    try {
      await hre.run("verify:verify", { address, constructorArguments: [deployer.address] });
      console.log("Contract verified on Basescan!");
    } catch (e) {
      console.log("Verification failed (can retry later):", e.message);
    }
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
