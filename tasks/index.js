task("deploy", "Deploys the Treasury contract").setAction(
  async (taskArgs, hre) => {
    const [deployer] = await hre.ethers.getSigners();
    const Treasury = await hre.ethers.getContractFactory("Treasury", deployer);
    const treasury = await Treasury.deploy();
    await treasury.deployed();
    console.log(
      `Treasury with owner ${deployer.address} successfully deployed!`,
      treasury.address
    );
  }
);

task("storeFunds", "Task to interact with the storeFunds function")
  .addParam("amount", "The amount of funds to store")
  .setAction(async (taskArgs, hre) => {
    const [deployer, firstUser] = await hre.ethers.getSigners();
    const Treasury = await ethers.getContractFactory("Treasury");
    const treasury = await Treasury.deploy();
    const treasuryFirstUser = treasury.connect(firstUser);
    const tx = await treasuryFirstUser.storeFunds({
      value: ethers.utils.parseEther(taskArgs.amount),
    });
    const receipt = await tx.wait();
    if (receipt.status === 1) {
      console.log("Funds successfully stored!");
    } else if (receipt.status === 0) {
      console.log("Transaction failed!");
    }

    console.log("Stored funds", receipt);
  });
