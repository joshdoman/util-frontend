// src/pages/index.tsx
import type { NextPage } from 'next'
import Head from 'next/head'
import { useBalance, sepolia } from 'wagmi'
import { VStack, Heading, Box } from "@chakra-ui/layout"
import { Alert, AlertIcon, Text, Button } from '@chakra-ui/react'
import { useState, useEffect } from 'react'
import { ethers } from 'ethers'
import Overview from 'components/Overview'
import ClaimTokens from 'components/ClaimTokens'
import Convert from 'components/Convert'
import { PeerFedABI as peerFedABI } from 'abi/PeerFedABI'
import { ERC20ABI as erc20ABI } from 'abi/ERC20ABI'
import Transfer from 'components/Transfer'
import { formatEther, parseEther } from 'ethers/lib/utils'

declare let window: any

const Home: NextPage = () => {
  const [balance, setBalance] = useState<string | undefined>()
  const [token0Balance, setToken0Balance] = useState<string | undefined>()
  const [token1Balance, setToken1Balance] = useState<string | undefined>()
  const [currentAccount, setCurrentAccount] = useState<`0x${string}` | undefined>()
  const [chainId, setChainId] = useState<number | undefined>()
  const [chainname, setChainName] = useState<string | undefined>()

  useEffect(() => {
    if(!window.ethereum) return
    const provider = new ethers.providers.Web3Provider(window.ethereum)
    provider.getNetwork().then((result)=>{
      setChainId(result.chainId)
      setChainName(result.name)
    })

    window.ethereum.on('chainChanged', (_chainId: any) => window.location.reload())
  },[])

  useEffect(() => {
    if(!currentAccount || !ethers.utils.isAddress(currentAccount)) return
    //client side code
    if(!window.ethereum) return
    const provider = new ethers.providers.Web3Provider(window.ethereum)
    provider.getBalance(currentAccount).then((result)=>{
      setBalance(ethers.utils.formatEther(result))
    })
    provider.getNetwork().then((result)=>{
      setChainId(result.chainId)
      setChainName(result.name)
    })

  },[currentAccount])

  const onClickConnect = () => {
    //client side code
    if(!window.ethereum) {
      console.log("please install MetaMask")
      return
    }
    /*
    //change from window.ethereum.enable() which is deprecated
    //see docs: https://docs.metamask.io/guide/ethereum-provider.html#legacy-methods
    window.ethereum.request({ method: 'eth_requestAccounts' })
    .then((accounts:any)=>{
      if(accounts.length>0) setCurrentAccount(accounts[0])
    })
    .catch('error',console.error)
    */

    //we can do it using ethers.js
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
    setBalance(undefined)
    setCurrentAccount(undefined)
  }

  const onSwitchToSepolia = async () => {
    console.log("Switch to Sepolia")
    if(!window.ethereum) return
    try {
      // Try to switch to Sepolia network
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0xaa36a7'  }],
      })
    } catch (error:any) {
      // Sepolia has not been added to MetaMask, so ask user to add it
      if (error.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: '0xaa36a7',
                chainName: 'Sepolia Test Network (Alchemy)',
                rpcUrls: ['https://eth-sepolia.g.alchemy.com/v2/4aFPOYn3QNfZhlNYrJRhwQ9POhwAjHHb'],
                nativeCurrency: {
                    name: "SepoliaETH",
                    symbol: "SepoliaETH",
                    decimals: 18
                },
                blockExplorerUrls: ["https://sepolia.etherscan.io"]
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

  const isSepolia = chainId == sepolia.id
  const peerfed = isSepolia ? '0x40bE7cA221F243d73cb4E48a67edC49cc6810779' : ''
  const token0 = isSepolia ? '0x80FC26F040f8eC8118d98b44D1a1d3a4a43C1435' : ''
  const token1 = isSepolia ? '0xf97B1caC77B589C2C549862FfCCdB86Fffd97382' : ''
  const library = isSepolia ? '0x3F0aB7Af43162090963837d9fDD74Cc2D96546e5' : ''

  const baseSymbol = 'BTC'
  const token0Symbol = 'TIGHTEN'
  const token1Symbol = 'EASE'

  // const { data: baseBalance } = useBalance({
  //   address: currentAccount as `0x${string}` | undefined,
  //   watch: true,
  // })
  // const { data: token0Balance } = useBalance({
  //   address: currentAccount as `0x${string}` | undefined,
  //   token: token0 as `0x${string}`,
  //   watch: true,
  // })
  // const { data: token1Balance } = useBalance({
  //   address: currentAccount as `0x${string}` | undefined,
  //   token: token1 as `0x${string}`,
  //   watch: true,
  // })

  const [accumulator,setAccumulator]=useState<number | undefined>()
  const [quote,setQuote]=useState<number | undefined>()
  const [interestRate,setInterestRate]=useState<number | undefined>()
  const [checkpointInterestRate,setCheckpointInterestRate]=useState<number | undefined>()
  const [token0Supply,setToken0Supply]=useState<number | undefined>()
  const [token1Supply,setToken1Supply]=useState<number | undefined>()
  const [blockTimestampLast,setBlockTimestampLast]=useState<number | undefined>()

  useEffect(() => {
    if(!window.ethereum) return;
    if(!peerfed) return;
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const peerfedContract = new ethers.Contract(peerfed, peerFedABI, provider);

    const sync = peerfedContract.filters.Sync();
    provider.on(sync, (reserve0, reserve1, blockTimestampLast, event) => {
        console.log('Sync', { reserve0, reserve1, blockTimestampLast, event })
        queryData()
    });

    queryData();

    // remove listener when the component is unmounted
    return () => {
      provider.removeAllListeners(sync)
    }
  }, [peerfed])

  async function queryData() {
    if(!window.ethereum) return;
    if(!peerfed) return;
    const provider = new ethers.providers.Web3Provider(window.ethereum)
    const peerfedContract = new ethers.Contract(peerfed, peerFedABI, provider);
    const accumulator = await peerfedContract.latestAccumulator();
    const quote = await peerfedContract.quote();
    const interestRate = await peerfedContract.interestRate();
    const checkpointInterestRate = await peerfedContract.checkpointInterestRate();
    const reserves = await peerfedContract.getReserves();
    const reserve0 = reserves._reserve0;
    const reserve1 = reserves._reserve1;
    const blockTimestampLast = reserves._blockTimestampLast;

    setAccumulator(Number(ethers.utils.formatEther(accumulator)));
    setQuote(Number(ethers.utils.formatEther(quote)));
    setInterestRate(Number(ethers.utils.formatEther(interestRate)));
    setCheckpointInterestRate(Number(ethers.utils.formatEther(checkpointInterestRate)));
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
    provider.on(token0To, (from, to, value, event) => {
        console.log('Transfer', { from, to, value, event })
        queryToken0Balance()
    });

    const token1From = token1Contract.filters.Transfer(currentAccount, undefined);
    provider.on(token1To, (from, to, value, event) => {
        console.log('Transfer', { from, to, value, event })
        queryToken1Balance()
    });

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
        {currentAccount
          ? <Button type="button" w='100%' onClick={onClickDisconnect}>
                Account:{currentAccount}
            </Button>
          : <Button type="button" w='100%' onClick={onClickConnect}>
                  Connect MetaMask
            </Button>
        }
        </Box>

        
        {chainId && !isSepolia ?
          <Box w='100%' my={4}>
            <Alert status='warning'>
              <AlertIcon />
              Currently available only on Sepolia. Please switch network on Metamask.
            </Alert>
          </Box>
          : <></>
        }

          {chainId && !isSepolia ?
            <Box w='100%' my={4}>
              <Button type="button" onClick={onSwitchToSepolia}>
                Switch to Sepolia
              </Button>
            </Box>
            : <></>
          }

        <Box  mb={0} p={4} w='100%' borderWidth="1px" borderRadius="lg">
          <Heading my={4}  fontSize='xl'>Overview</Heading>
          <Overview
            peerFedContract={peerfed}
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

        {/* <Box  mb={0} p={4} w='100%' borderWidth="1px" borderRadius="lg">
          <Heading my={4}  fontSize='xl'>Transfer Bitcoin</Heading>
          <Transfer
            peerFedContract={peerfed}
            currentAccount={currentAccount}
            baseBalance={baseBalance}
            quote={quote}
          />
        </Box> */}

        <Box  mb={0} p={4} w='100%' borderWidth="1px" borderRadius="lg">
          <Heading my={4}  fontSize='xl'>Swap</Heading>
          <Convert
            peerFedContract={peerfed}
            libraryContract={library}
            token0Symbol={token0Symbol}
            token1Symbol={token1Symbol}
            currentAccount={currentAccount}
            token0Balance={token0Balance}
            token1Balance={token1Balance}
          />
        </Box>

        <Box  mb={0} p={4} w='100%' borderWidth="1px" borderRadius="lg">
          <Heading my={4}  fontSize='xl'>Mint Tokens</Heading>
          <ClaimTokens
            peerFedContract={peerfed}
            currentAccount={currentAccount}
            token0Balance={token0Balance}
            token1Balance={token1Balance}
            token0Symbol={token0Symbol}
            token1Symbol={token1Symbol}
          />
        </Box>
      </VStack>
    </>
  )
}

export default Home
