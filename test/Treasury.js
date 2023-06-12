const {
  time,
  loadFixture,
} = require("@nomicfoundation/hardhat-network-helpers");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const { expect } = require("chai");

describe("Treasury", function () {
  async function treasuryFixture() {
    // Contracts are deployed using the first signer/account by default
    const [deployer, firstUser] = await ethers.getSigners();

    const Treasury = await ethers.getContractFactory("Treasury");
    const treasury = await Treasury.deploy();
    const treasuryFirstUser = treasury.connect(firstUser);
    const treasurySecondUser = treasury.connect(deployer);
    await treasuryFirstUser.storeFunds({
      value: ethers.utils.parseEther("1.0"),
    });
    return {
      treasury,
      deployer,
      treasuryFirstUser,
      treasurySecondUser,
      firstUserAddress: firstUser.getAddress(),
    };
  }

  describe("initiate withdrawal", function () {
    it("should revert if there are not enough funds to withdraw", async function () {
      const { treasuryFirstUser } = await loadFixture(treasuryFixture);
      await expect(
        treasuryFirstUser.initiateWithdrawal(
          ethers.utils.parseEther("2.0"),
          "test description",
          1
        )
      ).to.be.revertedWith("Insufficient funds");
    });

    it("should revert if the duration is more than 30 days", async function () {
      const { treasuryFirstUser } = await loadFixture(treasuryFixture);
      await expect(
        treasuryFirstUser.initiateWithdrawal(
          ethers.utils.parseEther("0.5"),
          "test description",
          31
        )
      ).to.be.revertedWith("Duration cannot be more than 30 days");
    });

    it("should revert if the duration is less than 1 day", async function () {
      const { treasuryFirstUser } = await loadFixture(treasuryFixture);
      await expect(
        treasuryFirstUser.initiateWithdrawal(
          ethers.utils.parseEther("0.5"),
          "test description",
          0
        )
      ).to.be.revertedWith("Duration cannot be less than 1 day");
    });

    it("should not revert if everything is ok", async function () {
      const { treasuryFirstUser } = await loadFixture(treasuryFixture);
      await expect(
        treasuryFirstUser.initiateWithdrawal(
          ethers.utils.parseEther("0.5"),
          "test description",
          1
        )
      ).to.not.be.reverted;
    });
  });

  describe("voting", function () {
    it("should revert if the user does not have enough funds to vote", async function () {
      const { treasurySecondUser } = await loadFixture(treasuryFixture);
      await expect(treasurySecondUser.vote(0, "yes", 1000)).to.be.revertedWith(
        "Insufficient tokens"
      );
    });

    it("should revert if the withdrawal has expired", async function () {
      const { treasuryFirstUser } = await loadFixture(treasuryFixture);
      await treasuryFirstUser.initiateWithdrawal(
        ethers.utils.parseEther("0.5"),
        "test description",
        1
      );
      await time.increase(time.duration.days(2));
      await expect(treasuryFirstUser.vote(0, "yes", 1000)).to.be.revertedWith(
        "Voting period has expired"
      );
    });

    it("should not revert if everything is ok", async function () {
      const { treasuryFirstUser } = await loadFixture(treasuryFixture);
      await treasuryFirstUser.initiateWithdrawal(
        ethers.utils.parseEther("0.5"),
        "test description",
        1
      );
      await expect(treasuryFirstUser.vote(0, "yes", 1000)).to.not.be.reverted;
    });

    // added to cover the line with the "no" vote
    it("should not revert if everything is ok #2", async function () {
      const { treasuryFirstUser } = await loadFixture(treasuryFixture);
      await treasuryFirstUser.initiateWithdrawal(
        ethers.utils.parseEther("0.5"),
        "test description",
        1
      );
      await expect(treasuryFirstUser.vote(0, "no", 1000)).to.not.be.reverted;
    });
  });

  describe("withdraw tokens", function () {
    it("should revert if the withdrawal has not expired", async function () {
      const { treasuryFirstUser } = await loadFixture(treasuryFixture);
      await treasuryFirstUser.initiateWithdrawal(
        ethers.utils.parseEther("0.5"),
        "test description",
        1
      );
      await expect(
        treasuryFirstUser.withdrawTokens(0, treasuryFirstUser.address)
      ).to.be.revertedWith("Voting period has not yet expired");
    });

    it("should not revert if everything is ok", async function () {
      const { treasuryFirstUser } = await loadFixture(treasuryFixture);
      await treasuryFirstUser.initiateWithdrawal(
        ethers.utils.parseEther("0.5"),
        "test description",
        1
      );
      await time.increase(time.duration.days(2));
      await expect(
        treasuryFirstUser.withdrawTokens(0, treasuryFirstUser.address)
      ).to.not.be.reverted;
    });
  });

  describe("store funds", function () {
    it("should revert if the value is 0", async function () {
      const { treasuryFirstUser } = await loadFixture(treasuryFixture);
      await expect(
        treasuryFirstUser.storeFunds({
          value: ethers.utils.parseEther("0.0"),
        })
      ).to.be.revertedWith("Value must be greater than 0");
    });

    it("should enable storing funds", async function () {
      const { treasuryFirstUser } = await loadFixture(treasuryFixture);
      expect(
        await treasuryFirstUser.storeFunds({
          value: ethers.utils.parseEther("1.0"),
        })
      ).to.not.be.reverted;
    });
  });

  describe("execute withdrawal", function () {
    it("should revert if the withdrawal has not expired", async function () {
      const { treasuryFirstUser } = await loadFixture(treasuryFixture);
      await treasuryFirstUser.initiateWithdrawal(
        ethers.utils.parseEther("0.5"),
        "test description",
        1
      );
      await expect(
        treasuryFirstUser.executeWithdrawal(0, treasuryFirstUser.address)
      ).to.be.revertedWith("Voting period has not yet expired");
    });

    it("should revert if the no vote has more tokens than the yes vote", async function () {
      const { treasuryFirstUser } = await loadFixture(treasuryFixture);
      await treasuryFirstUser.initiateWithdrawal(
        ethers.utils.parseEther("0.5"),
        "test description",
        1
      );
      await treasuryFirstUser.vote(0, "no", 1000);
      await time.increase(time.duration.days(2));
      await expect(
        treasuryFirstUser.executeWithdrawal(0, treasuryFirstUser.address)
      ).to.be.revertedWith("Withdrawal has not been approved");
    });

    it("should revert if it is not the owner", async function () {
      const { treasuryFirstUser, treasurySecondUser } = await loadFixture(
        treasuryFixture
      );
      await treasuryFirstUser.initiateWithdrawal(
        ethers.utils.parseEther("0.5"),
        "test description",
        1
      );
      await treasuryFirstUser.vote(0, "yes", 1000);
      await time.increase(time.duration.days(2));
      await expect(
        treasurySecondUser.executeWithdrawal(0, treasuryFirstUser.address)
      ).to.be.revertedWith("Only the owner can execute the withdrawal");
    });

    it("should not revert if everything is ok", async function () {
      const { treasuryFirstUser, firstUserAddress } = await loadFixture(
        treasuryFixture
      );
      await treasuryFirstUser.initiateWithdrawal(
        ethers.utils.parseEther("0.5"),
        "test description",
        1
      );
      await treasuryFirstUser.vote(0, "yes", 1000);
      await time.increase(time.duration.days(2));
      await expect(treasuryFirstUser.executeWithdrawal(0, firstUserAddress)).to
        .not.be.reverted;
    });
  });
});
