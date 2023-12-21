// src/pages/index.tsx
import type { NextPage } from 'next'
import Head from 'next/head'
import { VStack, Heading, Box } from "@chakra-ui/layout"
import { Alert, AlertIcon, Text, Button } from '@chakra-ui/react'
import { useState, useEffect } from 'react'
import { ethers } from 'ethers'
import Overview from 'components/Overview'
import ClaimTokens from 'components/ClaimTokens'
import Convert from 'components/Convert'
import { UtilABI as utilABI } from 'abi/UtilABI'
import { ERC20ABI as erc20ABI } from 'abi/ERC20ABI'
import Transfer from 'components/Transfer'
import { formatEther } from 'ethers/lib/utils'

declare let window: any

const Home: NextPage = () => {
  const [baseBalance, setBaseBalance] = useState<string | undefined>()
  const [token0Balance, setToken0Balance] = useState<string | undefined>()
  const [token1Balance, setToken1Balance] = useState<string | undefined>()
  const [currentAccount, setCurrentAccount] = useState<`0x${string}` | undefined>()
  const [chainId, setChainId] = useState<number | undefined>()
  const [walletInstalled, setWalletInstalled] = useState<boolean>(false)

  useEffect(() => {
    if(!window.ethereum) return
    setWalletInstalled(true);
    const provider = new ethers.providers.Web3Provider(window.ethereum)
    provider.getNetwork().then((result)=>{
      setChainId(result.chainId)
    })

    window.ethereum.on('chainChanged', (_chainId: any) => window.location.reload())
  },[])

  useEffect(() => {
    if(!currentAccount || !ethers.utils.isAddress(currentAccount)) return
    //client side code
    if(!window.ethereum) return
    const provider = new ethers.providers.Web3Provider(window.ethereum)
    provider.getNetwork().then((result)=>{
      setChainId(result.chainId)
    })

  },[currentAccount])

  const onClickConnect = () => {
    if(!window.ethereum) {
      console.log("please install MetaMask")
      return
    }
    const provider = new ethers.providers.Web3Provider(window.ethereum)
    // MetaMask requires requesting permission to connect users accounts
    provider.send("eth_requestAccounts", [])
    .then((accounts)=>{
      if(accounts.length>0) setCurrentAccount(accounts[0])
    })
    .catch((e)=>console.log(e))
  }

  const onClickDisconnect = () => {
    console.log("onClickDisConnect")
    setCurrentAccount(undefined)
  }

  const blockExplorer = "https://explorer.testnet.rsk.co/";

  const onSwitchToRootstock = async () => {
    console.log("Switch to RSK Testnet")
    if(!window.ethereum) return
    try {
      // Try to switch to Rootstock network
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0x1F'  }],
      })
    } catch (error:any) {
      // Rootstock has not been added to MetaMask, so ask user to add it
      if (error.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: '0x1F',
                chainName: 'RSK Testnet',
                rpcUrls: ['https://public-node.testnet.rsk.co'],
                nativeCurrency: {
                    name: "tRBTC",
                    symbol: "tRBTC",
                    decimals: 18
                },
                blockExplorerUrls: [blockExplorer]
              },
            ],
          });
        } catch (error) {
          console.log(error);
        }
      }
      console.log(error)
    }
  }

  const isRootstock = chainId == 31
  const util = isRootstock ? '0xAFAB8a8CA539adeb8C63840D1AD3Db985A3F0126' : ''
  const token0 = isRootstock ? '0x512A8a847d01F9E6c72462ce8299cF79ad1ab097' : ''
  const token1 = isRootstock ? '0x23AD1119904c61be486CFA14CFcc4Ceb743b2E51' : ''
  const library = isRootstock ? '0x3d2758BADb853aa2CA3d84BCD09d232FfCdb5792' : ''

  const token0Symbol = 'Tighten'
  const token1Symbol = 'Ease'

  const [accumulator,setAccumulator]=useState<number | undefined>()
  const [quote,setQuote]=useState<number | undefined>()
  const [interestRate,setInterestRate]=useState<number | undefined>()
  const [checkpointInterestRate,setCheckpointInterestRate]=useState<number | undefined>()
  const [token0Supply,setToken0Supply]=useState<number | undefined>()
  const [token1Supply,setToken1Supply]=useState<number | undefined>()
  const [blockTimestampLast,setBlockTimestampLast]=useState<number | undefined>()

  useEffect(() => {
    if(!window.ethereum) return;
    if(!util) return;
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const utilContract = new ethers.Contract(util, utilABI, provider);

    const sync = utilContract.filters.Sync();
    provider.on(sync, (reserve0, reserve1, blockTimestampLast, event) => {
        console.log('Sync', { reserve0, reserve1, blockTimestampLast, event })
        queryOverallState()
    });

    queryOverallState();

    // remove listener when the component is unmounted
    return () => {
      provider.removeAllListeners(sync)
    }
  }, [util])

  async function queryOverallState() {
    if(!window.ethereum) return;
    if(!util) return;
    const provider = new ethers.providers.Web3Provider(window.ethereum)
    const utilContract = new ethers.Contract(util, utilABI, provider);
    const accumulator = await utilContract.latestAccumulator();
    const quote = await utilContract.quote();
    const interestRate = await utilContract.interestRate();
    const checkpoint = await utilContract.currentCheckpoint();
    const reserves = await utilContract.getReserves();
    const reserve0 = reserves._reserve0;
    const reserve1 = reserves._reserve1;
    const blockTimestampLast = reserves._blockTimestampLast;

    setAccumulator(Number(ethers.utils.formatEther(accumulator)));
    setQuote(Number(ethers.utils.formatEther(quote)));
    setInterestRate(Number(ethers.utils.formatEther(interestRate)));
    setCheckpointInterestRate(Number(ethers.utils.formatEther(checkpoint.interestRate)));
    setToken0Supply(Number(ethers.utils.formatEther(reserve0)));
    setToken1Supply(Number(ethers.utils.formatEther(reserve1)));
    setBlockTimestampLast(blockTimestampLast);
  }

  useEffect(() => {
    if(!window.ethereum) return;
    if(!token0 || !token1 || !currentAccount) return;
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    

    const token0Contract = new ethers.Contract(token0, erc20ABI, provider);
    const token1Contract = new ethers.Contract(token1, erc20ABI, provider);

    const token0To = token0Contract.filters.Transfer(undefined, currentAccount);
    provider.on(token0To, (from, to, value, event) => {
        console.log('Transfer', { from, to, value, event })
        queryToken0Balance()
    });

    const token1To = token1Contract.filters.Transfer(undefined, currentAccount);
    provider.on(token1To, (from, to, value, event) => {
        console.log('Transfer', { from, to, value, event })
        queryToken1Balance()
    });

    const token0From = token0Contract.filters.Transfer(currentAccount, undefined);
    provider.on(token0From, (from, to, value, event) => {
        console.log('Transfer', { from, to, value, event })
        queryToken0Balance()
    });

    const token1From = token1Contract.filters.Transfer(currentAccount, undefined);
    provider.on(token1From, (from, to, value, event) => {
        console.log('Transfer', { from, to, value, event })
        queryToken1Balance()
    });

    queryBaseBalance();
    queryToken0Balance();
    queryToken1Balance();

    // remove listener when the component is unmounted
    return () => {
      provider.removeAllListeners(token0To)
      provider.removeAllListeners(token1To)
      provider.removeAllListeners(token0From)
      provider.removeAllListeners(token1From)
    }
  }, [token0, token1, currentAccount])

  async function queryBaseBalance() {
    if(!window.ethereum) return;
    if(!currentAccount) return;
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const balance = await provider.getBalance(currentAccount);
    setBaseBalance(formatEther(balance));
  }

  async function queryToken0Balance() {
    if(!window.ethereum) return;
    if(!token0 || !currentAccount) return;
    const provider = new ethers.providers.Web3Provider(window.ethereum)
    const erc20Contract = new ethers.Contract(token0, erc20ABI, provider);
    const token0Balance = await erc20Contract.balanceOf(currentAccount);
    setToken0Balance(formatEther(token0Balance));
  }

  async function queryToken1Balance() {
    if(!window.ethereum) return;
    if(!token1 || !currentAccount) return;
    const provider = new ethers.providers.Web3Provider(window.ethereum)
    const erc20Contract = new ethers.Contract(token1, erc20ABI, provider);
    const token1Balance = await erc20Contract.balanceOf(currentAccount);
    setToken1Balance(formatEther(token1Balance));
  }

  return (
    <>
      <Head>
        <title>The Util</title>
      </Head>

      <Heading as="h3"  my={4}>Explore The Util</Heading>
      <VStack>
        <Box w='100%' my={4}>
        {walletInstalled ? (
          currentAccount
          ? <Button type="button" w='100%' onClick={onClickDisconnect}>
                Account:{currentAccount}
            </Button>
          : <Button type="button" w='100%' onClick={onClickConnect}>
                  Connect MetaMask
            </Button>
        ) : <Button type="button" w='100%' onClick={() => window.open("https://chromewebstore.google.com/detail/metamask/nkbihfbeogaeaoehlefnkodbefgpgknn")}>
                Install MetaMask
          </Button>
        }
        </Box>

        
        {chainId && !isRootstock ?
          <Box w='100%' my={4}>
            <Alert status='warning'>
              <AlertIcon />
              Currently available only on RSK Testnet. Please switch network on Metamask.
            </Alert>
          </Box>
          : <></>
        }

          {chainId && !isRootstock ?
            <Box w='100%' my={4}>
              <Button type="button" onClick={onSwitchToRootstock}>
                Switch to RSK Testnet
              </Button>
            </Box>
            : <></>
          }

        <Box  mb={0} p={4} w='100%' borderWidth="1px" borderRadius="lg">
          <Heading my={4}  fontSize='xl'>Overview</Heading>
          <Overview
            token0Symbol={token0Symbol}
            token1Symbol={token1Symbol}
            accumulator={accumulator}
            checkpointInterestRate={checkpointInterestRate}
            quote={quote}
            interestRate={interestRate}
            token0Supply={token0Supply}
            token1Supply={token1Supply}
            blockTimestampLast={blockTimestampLast}
          />
        </Box>

        <Box  mb={0} p={4} w='100%' borderWidth="1px" borderRadius="lg">
          <Heading my={4}  fontSize='xl'>Swap</Heading>
          <Convert
            utilContract={util}
            libraryContract={library}
            token0Symbol={token0Symbol}
            token1Symbol={token1Symbol}
            currentAccount={currentAccount}
            token0Balance={token0Balance}
            token1Balance={token1Balance}
            blockExplorer={blockExplorer}
            queryOverallState={queryOverallState}
            queryToken0Balance={queryToken0Balance}
            queryToken1Balance={queryToken1Balance}
          />
        </Box>

        <Box  mb={0} p={4} w='100%' borderWidth="1px" borderRadius="lg">
          <Heading my={4}  fontSize='xl'>Auction</Heading>
          <ClaimTokens
            utilContract={util}
            currentAccount={currentAccount}
            token0Symbol={token0Symbol}
            token1Symbol={token1Symbol}
            baseSymbol={'tRBTC'}
            baseBalance={baseBalance}
            blockExplorer={blockExplorer}
            queryOverallState={queryOverallState}
            queryBaseBalance={queryBaseBalance}
            queryToken0Balance={queryToken0Balance}
            queryToken1Balance={queryToken1Balance}
          />
        </Box>

        <Box  mb={0} p={4} w='100%' borderWidth="1px" borderRadius="lg">
          <Heading my={4}  fontSize='xl'>Transfer</Heading>
          <Transfer
            utilContract={util}
            token0Symbol={token0Symbol}
            token1Symbol={token1Symbol}
            currentAccount={currentAccount}
            baseBalance={baseBalance}
            token0Balance={token0Balance}
            token1Balance={token1Balance}
            token0Contract={token0}
            token1Contract={token1}
            blockExplorer={blockExplorer}
            quote={quote}
            queryBaseBalance={queryBaseBalance}
            queryToken0Balance={queryToken0Balance}
            queryToken1Balance={queryToken1Balance}
          />
        </Box>
      </VStack>
    </>
  )
}

export default Home
