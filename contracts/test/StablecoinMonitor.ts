import { expect } from "chai";
import { ethers } from "hardhat";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";

describe("CexAmlAuditTrail", () => {
  async function deployFixture() {
    const [backend, outsider] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("CexAmlAuditTrail");
    const trail = await Factory.deploy();
    await trail.waitForDeployment();
    return { trail, backend, outsider };
  }

  it("increments event ids and emits SuspiciousActivity logs", async () => {
    const { trail, backend } = await deployFixture();
    const user = ethers.encodeBytes32String("user-1");
    const tx = ethers.encodeBytes32String("tx-1");

    await expect(trail.connect(backend).logSuspicious(user, tx, "Structuring"))
      .to.emit(trail, "SuspiciousActivity")
      .withArgs(1, user, tx, "Structuring", anyValue);

    expect(await trail.eventId()).to.equal(1);
  });

  it("records deposit traces and resolutions", async () => {
    const { trail, backend } = await deployFixture();
    const user = ethers.encodeBytes32String("user-2");
    const deposit = ethers.encodeBytes32String("deposit-1");
    const internalTx = ethers.encodeBytes32String("case-9");

    await expect(trail.connect(backend).logDepositTrace(user, deposit, 8453, backend.address, 123456))
      .to.emit(trail, "DepositTrace")
      .withArgs(1, user, deposit, 8453, backend.address, 123456);

    await expect(trail.connect(backend).logResolution(user, internalTx, "release", false))
      .to.emit(trail, "AmlResolution")
      .withArgs(2, user, internalTx, "release", false, anyValue);

    expect(await trail.eventId()).to.equal(2);
  });

  it("restricts logging to the backend signer", async () => {
    const { trail, outsider } = await deployFixture();
    await expect(
      trail.connect(outsider).logSuspicious(ethers.ZeroHash, ethers.ZeroHash, "nope")
    ).to.be.revertedWith("Only CEX");
  });
});

