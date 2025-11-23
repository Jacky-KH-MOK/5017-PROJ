import { ethers } from "hardhat";
import fs from "fs";
import path from "path";

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log(`Deploying with ${deployer.address}`);

  const AuditTrail = await ethers.getContractFactory("CexAmlAuditTrail");
  const trail = await AuditTrail.deploy();
  await trail.waitForDeployment();

  const address = await trail.getAddress();
  console.log(`CexAmlAuditTrail deployed at ${address}`);

  const repoRoot = path.resolve(__dirname, "..", "..");
  const deploymentsDir = path.join(repoRoot, "deployments");
  const deploymentFile = path.join(deploymentsDir, "local.json");
  fs.mkdirSync(deploymentsDir, { recursive: true });
  fs.writeFileSync(
    deploymentFile,
    JSON.stringify(
      {
        address,
        network: "localhost",
        deployedAt: new Date().toISOString(),
      },
      null,
      2
    )
  );
  console.log(`Saved deployment info to ${deploymentFile}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

