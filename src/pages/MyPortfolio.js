import React, { useEffect, useState } from "react";
import axios from "axios";
import PageTitle from "../components/Typography/PageTitle";
import {
  Card,
  CardBody,
  Table,
  TableHeader,
  TableCell,
  TableBody,
  TableRow,
  TableContainer,
  Input,
} from "@windmill/react-ui";
import { FiInfo, FiDownload, FiArrowRight } from "react-icons/fi";
import { MenuIcon, MenuItems, Left } from "../components/Portfolio/";
import FileDownload from "js-file-download";
import ChartCard from "../components/Chart/ChartCard";
import { Doughnut, Line, Bar } from "react-chartjs-2";
import Modal from "../components/address-modal";
import ContextNav from "../components/ContextNav";
import { getPerson, userSession } from "../scripts/auth";
import { useSelector } from "react-redux";
import delegateSTX from "../delegation/1.delegatestx";
import "../assets/css/tippy.css";
import { useDispatch } from "react-redux";
import { userDetails } from "../redux/reducers";
import { Right } from "../components/right";
import getStackerInfor from "../delegation/getStackerInfo";
import { useHistory } from "react-router-dom";

const micro = 1000000;

function MyPortfolio() {
  const history = useHistory();

  if (userSession.isSignInPending()) {
    userSession.handlePendingSignIn().then((userData) => {
      history.push("/app/network");
    });
  }
  let data;
  try {
    data = getPerson();
  } catch (e) {
    history.push("/app/network");
  }

  const prices = useSelector((state) => state.prices);
  const state = useSelector((state) => state.user);
  const [txs, setTxs] = useState([]);
  const [portfolio, setPortfolio] = useState({
    balance: "0",
    total_sent: "0",
    total_received: "0",
    total_fees_sent: "0",
    total_miner_rewards_received: "0",
    lock_tx_id: "",
    locked: "0",
    lock_height: 0,
    burnchain_lock_height: 0,
    burnchain_unlock_height: 0,
  });
  const [addressValue, setaddressValue] = useState([]);
  const [stxAddress, setStxAddress] = useState("");
  const [btcAddress, addBTCAddress] = useState(state.btcAddress[0]);
  const [message, showBTCMessage] = useState(false);
  const [addaddress, showAddAddress] = useState(false);
  const [dailyReward, setDailyReward] = useState(0);
  const [dateForGraph, setDateForGraph] = useState([]);
  const [rewardForGraph, setRewardForGraph] = useState([]);
  const [txLoader, setTxLoader] = useState(false);
  const dispatch = useDispatch();
  //Address Modal
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);

  function openAddressModal() {
    setIsAddressModalOpen(true);
  }

  function closeAddressModal() {
    setIsAddressModalOpen(false);
  }

  //Address Modal

  const [isManualAddressModalOpen, setIsManualAddressModalOpen] = useState(
    false
  );

  function openManualAddressModal() {
    setIsManualAddressModalOpen(true);
  }

  function closeManualAddressModal() {
    setIsManualAddressModalOpen(false);
  }

  const [stx, setSTX] = useState(0);

  const lineOptions = {
    data: {
      labels: dateForGraph,
      datasets: [
        {
          backgroundColor: "#0694a2",
          borderColor: "#0694a2",
          data: rewardForGraph,
          fill: true,
        },
      ],
    },
    options: {
      responsive: true,
      tooltips: {
        mode: "index",
        intersect: false,
      },
      hover: {
        mode: "nearest",
        intersect: true,
      },
      scales: {
        x: {
          display: true,
          scaleLabel: {
            display: true,
            labelString: "Month",
          },
        },
        y: {
          display: true,
          scaleLabel: {
            display: true,
            labelString: "Value",
          },
        },
      },
    },
    legend: {
      display: false,
    },
  };

  useEffect(() => {
    const fetchData = async () => {
      if (data) {
        const address = data._profile.stxAddress.testnet;
        const result = await axios.get(
          `https://stacks-node-api.testnet.stacks.co/extended/v1/address/${address}/balances`
        );
        setPortfolio(result.data.stx);

        const values = await axios({
          url: `${process.env.REACT_APP_BACKENDURL}/btcAddressReward`,
          method: "post",
          data: state,
        });

        if (values.data.txs) setTxs(values.data.txs);

        const graph = await axios.post(
          `${process.env.REACT_APP_BACKENDURL}/getUserClaimedRewardsGraph`,
          { username: state.username }
        );

        setDateForGraph(
          graph.data.date.map((value) => {
            console.log(value);
            var date = new Date(value);
            return date.toLocaleDateString();
          })
        );
        setRewardForGraph(graph.data.reward);

        const claimReward = await axios.post(
          `${process.env.REACT_APP_BACKENDURL}/getUserClaimedRewardsGraph`,
          { username: state.username }
        );

        if (claimReward.status === 405) {
          setDailyReward(0);
        } else {
          setDailyReward(claimReward.data.value);
        }

        const vs = [];

        for (let i of state.stxAddress) {
          try {
            const result = await axios.get(
              `https://stacks-node-api.testnet.stacks.co/extended/v1/address/${i}/balances`
            );

            vs.push(result.data.stx.balance);
          } catch (e) {
            vs.push(0);
          }
        }

        setaddressValue(vs);
      }
    };
    fetchData();
    // getStackerInfor();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [history, state, state.username]);

  const addAddress = async () => {
    const makeTheCal = await axios({
      method: "post",
      url: `${process.env.REACT_APP_BACKENDURL}/addresses`,
      data: {
        username: state.username,
        stxAddress,
        btcAddress,
      },
    });
    console.log(makeTheCal);

    dispatch({ type: userDetails, payload: makeTheCal.data });
  };

  const claim = async () => {
    if (state.btcAddress.length === 0) {
      showAddAddress(true);
    } else {
      const result = await axios({
        method: "post",
        url: `${process.env.REACT_APP_BACKENDURL}/btcClaim`,
        headers: {
          "x-auth-token": localStorage.getItem("auth"),
          "Content-Type": "application/json",
        },
        data: { username: state.username, btcAddress },
      });
      console.log(result);
      if (result.status === 200) {
        showBTCMessage(true);
      }
    }
  };

  const onStack = async () => {
    await axios.post(`${process.env.REACT_APP_BACKENDURL}/callHistory`, {
      functionName: "delegate-stx",
      stxAddress: getPerson()._profile.stxAddress.testnet,
      fee: 300,
    });

    const delegateStx = await delegateSTX({
      username: state.username,
      poxAddr: "n2VrgRFbKvcesbqerVtJEC8p5Lr2LQKtmB",
      amountSTX: stx * micro,
      delegateToo: "ST3K2B2FH1AYXD26WV6YZY4DAA82AZNK967BNB9BK",
      burnHt: 3,
      setTxLoader,
    });
  };

  const btcRewardHistoryCSV = async () => {
    await axios({
      url: `${process.env.REACT_APP_BACKENDURL}/generateCSV/${state.username}`,
      method: "get",
      headers: {
        "x-auth-token": localStorage.getItem("auth"),
        "Content-Type": "text/csv",
      },
    }).then((response) => {
      FileDownload(response.data, "report.csv");
    });
  };

  return (
    <>
      <PageTitle left={<Left />}></PageTitle>
      <div className="p-4 space-y-6">
        <Card>
          <CardBody className="text-white">
            <div className="flex flex-wrap">
              <div className="w-full xl:pr-10 xl:w-1/3">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium">BTC Reward</h3>
                    <FiInfo />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center justify-between py-2 border-b border-gray-400">
                      <span>Total BTC Reward</span>
                      <span className="text-lg text-warning-500">
                        {state.totalBTCReward || 0}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center justify-between py-2 border-b border-gray-400">
                      <span>Daily BTC Reward</span>
                      <span className="">{dailyReward || 0}</span>
                    </div>
                    <div className="flex flex-wrap items-center justify-between py-2 text-gray-300 border-b border-gray-400">
                      <span>Pending BTC Reward</span>
                      <span>{state.pendingBTCReward}</span>
                    </div>
                  </div>
                  <button
                    className="mt-4 mb-6 btn btn-outline-warning btn-sm btn-block"
                    onClick={claim}
                  >
                    Claim your BTC Reward
                  </button>

                  {addaddress && (
                    <p>Please add a btc address for payment checkout.</p>
                  )}
                  {message && (
                    <p>
                      Please wait for the Admin ( neko@stackedstats.com ) to
                      confirm your withdrawal.
                    </p>
                  )}
                  <ChartCard title="BTC Rewards">
                    <Line {...lineOptions} />
                  </ChartCard>
                </div>
              </div>
              <div className="w-full xl:w-2/3">
                <div className="flex flex-wrap justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    <span>
                      {" "}
                      <h3 className="mr-4 text-lg font-medium">
                        BTC Reward History
                      </h3>
                    </span>
                    <div
                      className="flex items-center ml-10 text-primary-400"
                      onClick={btcRewardHistoryCSV}
                    >
                      <FiDownload />
                      <button className="ml-1">Export</button>
                    </div>
                  </div>
                </div>
                <TableContainer className="mb-8">
                  <Table>
                    <TableHeader>
                      <tr>
                        <TableCell>Date</TableCell>
                        <TableCell>Network</TableCell>
                        <TableCell>From</TableCell>
                        <TableCell>To</TableCell>
                        <TableCell>Reward</TableCell>
                        {/* <TableCell>Explorer</TableCell> */}
                      </tr>
                    </TableHeader>
                    <TableBody className="text-lg divide-gray-500">
                      {txs.length > 0 &&
                        txs.map((value, index) => {
                          return (
                            <TableRow key={index}>
                              <TableCell>
                                <div className="text-lg text-white">
                                  {value.date}
                                </div>
                                <span className="text-sm">{value.date}</span>
                              </TableCell>
                              <TableCell>
                                <span className="text-white btn btn-outline-gray btn-xs">
                                  Testnet
                                </span>
                              </TableCell>
                              <TableCell>
                                <div className="text-sm text-white">
                                  Stackedsats
                                </div>
                                <span>{value.from}</span>
                              </TableCell>
                              <TableCell>
                                <div className="text-sm text-white">
                                  {value.to}
                                </div>
                                <div className="flex items-center text-sm text-warning-500">
                                  <FiArrowRight />
                                  <span className="ml-1">Bitcoin</span>
                                </div>
                                {/* <div className="flex items-center text-sm text-primary-400">
                                <FiArrowRight />
                                <span className="ml-1">Stacks</span>
                              </div> */}
                              </TableCell>
                              <TableCell>
                                <div className="text-sm text-white">
                                  {value.reward} STX
                                </div>
                                <div className="text-sm">
                                  <span className="text-warning-500">
                                    {parseFloat(
                                      value.reward /
                                        (prices.stxusd * prices.btcusd)
                                    ).toFixed(2)}
                                  </span>{" "}
                                  BTC |{" "}
                                  <span className="text-success-600">
                                    {parseFloat(
                                      prices.stxusd / value.reward
                                    ).toFixed(2)}
                                  </span>{" "}
                                  USD
                                </div>
                              </TableCell>
                              {/* <TableCell>
                                <a href="https://testnet-explorer.blockstack.org/txid/0x7f5db3a604f738af695b0b10c0369c42fd7a0efbcc25115fa5711f074abf92b6">
                                  <div className="flex justify-center">
                                    <Explorer />
                                  </div>
                                </a>
                              </TableCell> */}
                            </TableRow>
                          );
                        })}
                    </TableBody>
                  </Table>
                </TableContainer>
              </div>
            </div>
          </CardBody>
        </Card>

        <div className="grid gap-6 mb-8 xl:grid-cols-3">
          <Card>
            <Modal
              openAddressModal={openAddressModal}
              closeAddressModal={closeAddressModal}
              openManualAddressModal={openManualAddressModal}
              closeManualAddressModal={closeManualAddressModal}
              isAddressModalOpen={isAddressModalOpen}
              isManualAddressModalOpen={isManualAddressModalOpen}
              addBTCAddress={addBTCAddress}
              addAddress={addAddress}
              stxAddress={stxAddress}
              setStxAddress={setStxAddress}
            />
            <CardBody className="space-y-8 text-white">
              <div className="flex flex-wrap justify-between">
                <div className="flex flex-wrap items-center">
                  <h2 className="mr-3 text-2xl font-medium">Portfolio</h2>
                  <span className="text-gray-200">
                    {1 + state.btcAddress.length}
                  </span>
                </div>
              </div>
              {/* body */}
              <div className="flex flex-wrap justify-between">
                <div className="flex items-baseline space-x-2">
                  <span className="text-2xl">STX</span>
                  {/* <span className="text-gray-200">100%</span> */}
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-2xl">
                    {prices.stxusd * addressValue.reduce((a, b) => a + b, 0)}
                  </span>
                  <span className="font-medium text-gray-200">STX</span>
                </div>
              </div>
              <div>
                <div className="flex flex-wrap justify-between mb-3 text-gray-200">
                  <div className="flex">
                    <span>{state.stxAddress.length} addresses</span>
                  </div>
                  <div className="flex">
                    <span>
                      {prices.stxusd * addressValue.reduce((a, b) => a + b, 0)}
                    </span>
                  </div>
                </div>

                <ul>
                  {state.stxAddress.map((value, index) => {
                    return (
                      <li
                        className="p-2 mb-1 border-l-4 cursor-pointer hover:bg-primary-400 bg-primary-600 border-primary-300"
                        key={index}
                      >
                        <div className="flex flex-wrap justify-between">
                          <div className="flex flex-wrap items-center space-x-3">
                            <span>{value}</span>
                            <ContextNav
                              menuItems={
                                <MenuItems
                                  stx={value}
                                  username={state.username}
                                />
                              }
                              buttonIcon={<MenuIcon />}
                            ></ContextNav>
                          </div>
                          <div className="flex">
                            <span>{addressValue[index]}</span>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
              <hr className="border-gray-500" />
              <div className="flex flex-wrap justify-between">
                <div className="flex items-baseline space-x-2">
                  <span className="text-2xl">BTC</span>
                  {/* <span className="text-gray-200">100%</span> */}
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-2xl">
                    {addressValue.reduce((a, b) => a + b, 0)}
                  </span>
                  <span className="font-medium text-gray-200">BTC</span>
                </div>
              </div>
              <div>
                <div className="flex flex-wrap justify-between mb-3 text-gray-200">
                  <div className="flex">
                    <span>{state.btcAddress.length} Addresses</span>
                  </div>
                  <div className="flex">
                    <span>
                      {prices.stxusd * addressValue.reduce((a, b) => a + b, 0)}
                    </span>
                  </div>
                </div>

                <ul>
                  {state.btcAddress.map((value, index) => {
                    return (
                      <li
                        className="p-2 mb-1 border-l-4 cursor-pointer hover:bg-primary-400 bg-primary-600 border-primary-300"
                        key={index}
                      >
                        <div className="flex flex-wrap justify-between">
                          <div className="flex flex-wrap items-center space-x-3">
                            <span
                              onClick={() => {
                                addBTCAddress(value);
                              }}
                            >
                              {value}
                            </span>
                            <ContextNav
                              menuItems={
                                <MenuItems
                                  btc={value}
                                  username={state.username}
                                />
                              }
                              buttonIcon={<MenuIcon />}
                            ></ContextNav>
                          </div>
                          <div className="flex">
                            <span>{addressValue[index]}</span>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </CardBody>
          </Card>
          <Card>
            <CardBody className="space-y-8 text-white">
              <div className="flex flex-wrap justify-between">
                <div className="flex flex-wrap items-center">
                  <h2 className="mr-3 text-2xl font-medium">STX balance</h2>
                </div>
                {/* <div>
                  <Select className="py-1 pl-2 mt-1 bg-transparent border-gray-300 leading-1">
                    <option>USD</option>
                  </Select>
                </div> */}
              </div>
              <div>
                <div className="flex flex-wrap items-center justify-between py-2 border-b border-gray-400">
                  <div className="flex space-x-2">
                    <span>Total Balance</span>
                  </div>
                  <div className="flex space-x-2">
                    <span className="text-lg font-medium text-success-400">
                      {portfolio.balance / 1000000}
                    </span>
                  </div>
                </div>
                <div className="flex flex-wrap items-center justify-between py-2 border-b border-gray-400">
                  <div className="flex space-x-2">
                    <span>Available Balance</span>
                  </div>
                  <div className="flex space-x-2">
                    <span>
                      {(portfolio.balance - portfolio.locked) / 1000000}
                    </span>
                  </div>
                </div>
                <div className="flex flex-wrap items-center justify-between py-2">
                  <div className="flex space-x-2">
                    <span>Stacking Balance</span>
                  </div>
                  <div className="flex space-x-2">
                    <Input
                      className="py-3 mb-3 text-white bg-gray-800 border-none text-right"
                      placeholder="STX Value"
                      type="number"
                      value={stx}
                      onChange={(e) => {
                        setSTX(e.target.value);
                      }}
                    ></Input>
                  </div>
                </div>
              </div>
              <div>
                {/* <div className="flex justify-end mb-4">
                  <div>
                    <Select className="py-1 pl-2 mt-1 bg-transparent border-gray-300 leading-1">
                      <option>Daily</option>
                    </Select>
                  </div>
                </div> */}
                {/* <ChartCard title="Lines">
                  <Line {...lineOptions} />                </ChartCard> */}
              </div>
              <button
                className="mt-4 mb-6 btn btn-outline-primary btn-sm btn-block"
                onClick={onStack}
              >
                Stack now
              </button>
              {txLoader ? <div>Wait....</div> : <></>}
            </CardBody>
          </Card>
          <Card>
            <CardBody className="space-y-8 text-white">
              <div className="flex flex-wrap justify-between">
                <div className="flex flex-wrap items-center">
                  <h2 className="mr-3 text-2xl font-medium">BTC balance</h2>
                </div>
                <div>
                  {/* <Select className="py-1 pl-2 mt-1 bg-transparent border-gray-300 leading-1">
                    <option>USD</option>
                  </Select> */}
                </div>
              </div>
              <div>
                <div className="flex flex-wrap items-center justify-between py-2 border-b border-gray-400">
                  <div className="flex space-x-2">
                    <span>Total Balance</span>
                  </div>
                  <div className="flex space-x-2">
                    <span className="text-lg font-medium text-success-400">
                      {parseFloat(
                        portfolio.balance /
                          1000000 /
                          (prices.stxusd * prices.btcusd)
                      ).toFixed(2)}
                      BTC
                    </span>
                  </div>
                </div>
                <div className="flex flex-wrap items-center justify-between py-2 border-b border-gray-400">
                  <div className="flex space-x-2">
                    <span>Available Balance</span>
                  </div>
                  <div className="flex space-x-2">
                    <span>
                      {" "}
                      {parseFloat(
                        (portfolio.balance - portfolio.locked) /
                          1000000 /
                          (prices.stxusd * prices.btcusd)
                      ).toFixed(2)}{" "}
                      BTC
                    </span>
                  </div>
                </div>
                <div className="flex flex-wrap items-center justify-between py-2">
                  <div className="flex space-x-2">
                    <span>Stacking Balance</span>
                  </div>
                  <div className="flex space-x-2">
                    <span>
                      {parseFloat(
                        stx / (prices.stxusd * prices.btcusd)
                      ).toFixed(2)}{" "}
                      BTC
                    </span>
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>
        </div>
        <div></div>
      </div>
    </>
  );
}

export default MyPortfolio;
