// src/component/TransferERC20.tsx
import React, { useEffect, useState } from 'react'
import {Alert, AlertDescription, AlertIcon, Box, Button, CloseButton, Input , NumberInput,  NumberInputField,  FormControl,  FormLabel, Radio, RadioGroup, Spinner, Stack, InputGroup, NumberInputStepper, NumberIncrementStepper, NumberDecrementStepper, Text, InputRightAddon } from '@chakra-ui/react'
import {BigNumber, ethers} from 'ethers'
import {formatEther, parseEther} from 'ethers/lib/utils'
import { ERC20ABI as erc20ABI } from 'abi/ERC20ABI'
import { PeerFedABI as peerFedABI } from 'abi/PeerFedABI'
import { PeerFedLibraryExternalABI as libraryABI } from 'abi/PeerFedLibraryExternalABI'
import { TransactionResponse,TransactionReceipt } from "@ethersproject/abstract-provider"
import { useDisclosure } from '@chakra-ui/react'
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
} from '@chakra-ui/react'
import { format } from 'path'

interface Props {
    peerFedContract: string,
    libraryContract: string,
    token0Symbol: string,
    token1Symbol: string,
    currentAccount: string | undefined,
    token0Balance: any,
    token1Balance: any,
}

declare let window: any;

export default function Convert(props:Props){
  const peerFedContract = props.peerFedContract;
  const libraryContract = props.libraryContract;
  const token0Symbol = props.token0Symbol;
  const token1Symbol = props.token1Symbol;
  const currentAccount = props.currentAccount;
  const token0Balance = Number(props.token0Balance?.formatted ?? '0');
  const token1Balance = Number(props.token1Balance?.formatted ?? '0');
  
  const [inputType, setInputType] = React.useState('1')
  const [outputType, setOutputType] = React.useState('0')
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false)
  const [input,setInput]=useState<string>('')
  const [output,setOutput]=useState<string>('')
  const [slippageTolerance,setSlippageTolerance]=useState<string>('0.10')
  const [deadline,setDeadline]=useState<string>('10')
  const [isExactInput, setIsExactInput]=useState<boolean>(true)
  const [isInvalidInput, setIsInvalidInput]=useState<boolean>(false)
  const [isInvalidOutput, setIsInvalidOutput]=useState<boolean>(false)
  const [estimatedPriceImpact, setEstimatedPriceImpact]=useState<number | undefined>()
  const [interestRateImpact, setInterestRateImpact]=useState<number | undefined>()

  const [isSwapping, setIsSwapping]=useState<boolean>(false)
  const { isOpen: isOpenSwapModal, onOpen: onOpenSwapModal, onClose: onCloseSwapModel } = useDisclosure()

  // Debounce input value so that it only gives us latest value if input has not been updated within last 500ms.
  // The goal is to only have the getAmountOut/In call fire only when user stops typing
  const debouncedInput = useDebounce(input, 500);

  // Effect for input change
  useEffect(() => {
    if (Number(debouncedInput) == 0) {
      setOutput("")
      setEstimatedPriceImpact(undefined)
      setInterestRateImpact(undefined)
    } else {
      getAmountOut(window)
    }

    async function getAmountOut(window:any){
      if(!window.ethereum) return
      if(!peerFedContract || !libraryContract) return
      setIsExactInput(true)
      try {
        const provider = new ethers.providers.Web3Provider(window.ethereum)
        const peerfed = new ethers.Contract(peerFedContract, peerFedABI, provider);

        const reserves = await peerfed.getReserves();
        const reserve0 = reserves._reserve0;
        const reserve1 = reserves._reserve1;

        var inputReserve = inputType == '0' ? reserve0 : reserve1;
        var outputReserve = inputType == '0' ? reserve1 : reserve0;

        const amountIn = parseEther(Number(debouncedInput).toFixed(18));
        const library = new ethers.Contract(libraryContract, libraryABI, provider);
        const amountOut = await library.getAmountOut(amountIn, inputReserve, outputReserve);

        if (amountOut) {
          setOutput(ethers.utils.formatEther(amountOut))

          if (outputReserve.gt(0)) {
            const quote = amountIn.mul(inputReserve).div(outputReserve);
            const estimatedPriceImpact = Number(ethers.utils.formatEther(quote.sub(amountOut).mul(eth(1)).div(quote))) * 100;
            setEstimatedPriceImpact(estimatedPriceImpact);
          }

          const newReserve0 = inputType == '0' ? reserve0.sub(amountIn) : reserve0.add(amountOut);
          const newReserve1 = inputType == '0' ? reserve1.add(amountOut) : reserve1.sub(amountIn);
          const newInterestRate = getInterestRate(newReserve0, newReserve1);
          const currentInterestRate = getInterestRate(reserve0, reserve1);
          let interestRateImpact;
          if (newInterestRate.gt(currentInterestRate)) {
            interestRateImpact = Number(ethers.utils.formatEther(newInterestRate.sub(currentInterestRate))) * 100;
          } else {
            interestRateImpact = Number(ethers.utils.formatEther(currentInterestRate.sub(newInterestRate))) * -100;
          }
          setInterestRateImpact(interestRateImpact);
        }
      } catch (e) {
        console.error(e)
        setOutput("")
        setEstimatedPriceImpact(undefined)
        setInterestRateImpact(undefined)
      }
    }
  }, [debouncedInput, inputType, outputType]); // Only call effect if debounced input changes

  function getInterestRate(reserve0: BigNumber, reserve1: BigNumber) {
    if (reserve0.gt(reserve1)) {
      return reserve0.sub(reserve1).mul(eth(1)).div(reserve0.add(reserve1));
    } else {
      return BigNumber.from(0);
    }
  }

  // Debounce hook (source: https://usehooks.com/useDebounce/)
  function useDebounce(value:any, delay:number) {
    // State and setters for debounced value
    const [debouncedValue, setDebouncedValue] = useState(value);
    useEffect(
      () => {
        // Update debounced value after delay
        const handler = setTimeout(() => {
          setDebouncedValue(value);
        }, delay);
        // Cancel the timeout if value changes (also on delay change or unmount)
        // This is how we prevent debounced value from updating if value is changed ...
        // .. within the delay period. Timeout gets cleared and restarted.
        return () => {
          clearTimeout(handler);
        };
      },
      [value, delay] // Only re-call effect if value or delay changes
    );
    return debouncedValue;
  }

  const minOutput = Number(output) * (1 - Number(slippageTolerance) / 100);

  async function convert() {
    if(!window.ethereum) return
    if(!peerFedContract) return

    const provider = new ethers.providers.Web3Provider(window.ethereum)
    const signer = provider.getSigner()

    const now = new Date()
    var expiry = Math.trunc(now.getTime() / 1000) + Number(deadline) * 60

    // Add 10% margin to gas estimate to ensure sufficient gas
    const gasMargin = 1.1
    if (isExactInput) {
      const inputAmount = parseEther(input);
      const minOutputAmount = parseEther(minOutput.toFixed(18));
      const deadline = BigNumber.from(expiry);
      const peerfed = new ethers.Contract(peerFedContract, peerFedABI, signer);

      try {
        const input0 = inputType == '0';
        const gasEstimated = await peerfed.estimateGas.swapExactTokensForTokens(input0, inputAmount, minOutputAmount, currentAccount, deadline);
        const tr: TransactionResponse = await peerfed.swapExactTokensForTokens(input0, inputAmount, minOutputAmount, currentAccount, deadline, { gasLimit: Math.ceil(gasEstimated.toNumber() * gasMargin) });
        setIsSwapping(true);
        console.log(`TransactionResponse TX hash: ${tr.hash}`);
        const receipt: TransactionReceipt = await tr.wait();
        console.log("swap receipt",receipt);
        clearAmounts();
        onCloseSwapModel();
      } catch (e:any) {
        console.error(e);
      } finally {
        setIsSwapping(false)
      }
    }
  }

  function clearAmounts() {
    setInput("")
    setOutput("")
    setIsInvalidInput(false)
    setIsInvalidOutput(false)
  }

  const onInputTypeChange = (value:string) => {
    setInputType(value)
    setIsInvalidInput(false)
    setIsInvalidOutput(false)
  }

  const onOutputTypeChange = (value:string) => {
    setOutputType(value)
    setIsInvalidInput(false)
    setIsInvalidOutput(false)
  }

  const handleInputChange = (value:string) => setInput(value)
  const handleOutputChange = (value:string) => setOutput(value)
  const handleSlippageChange = (value:string) => setSlippageTolerance(value)
  const handleDeadlineChange = (value:string) => setDeadline(value)
  const handleAdvancedToggleChange = () => setShowAdvanced(!showAdvanced)

  const invalidInput = isInvalidInput ? (
    <Alert status='error'>
      <AlertIcon />
      Input too large
    </Alert>
  ) : null

  const invalidOutput = isInvalidOutput ? (
    <Alert status='error'>
      <AlertIcon />
      Output too large
    </Alert>
  ) : null

  const slippageComponent = showAdvanced ? (
    <>
      <FormLabel htmlFor='amount'>Slippage tolerance: </FormLabel>
      <InputGroup>
      <NumberInput value={slippageTolerance} min={0} max={10} onChange={handleSlippageChange}>
        <NumberInputField />
      </NumberInput>
      <InputRightAddon>%</InputRightAddon>
      </InputGroup>
      <br/>
    </>
  ) : null;

  const deadlineComponent = showAdvanced ? (
    <>
      <FormLabel htmlFor='amount'>Deadline: </FormLabel>
      <InputGroup>
      <NumberInput value={deadline} min={0} max={120} onChange={handleDeadlineChange}>
        <NumberInputField />
      </NumberInput>
      <InputRightAddon>minutes</InputRightAddon>
      </InputGroup>
      <br/>
    </>
  ) : null;

  const advancedToggleText = showAdvanced ? "Hide advanced" : "Show advanced"

  let inputSymbol: string = inputType == '0' ? token0Symbol : token1Symbol;
  let outputSymbol: string = inputType == '0' ? token1Symbol : token0Symbol;
  let inputBalance: number = inputType == '0' ? token0Balance : token1Balance;
  let outputBalance: number = inputType == '0' ? token1Balance : token0Balance;

  var interestRateImpactText = '';
  if (interestRateImpact) {
    interestRateImpactText = Math.abs(interestRateImpact) > 0.005 ? `${interestRateImpact.toFixed(2)}%` : `${(interestRateImpact * 100).toFixed(2)} bps`;
    if (interestRateImpact > 0) interestRateImpactText = "+" + interestRateImpactText;
  }

  return (
    <div>
      <form onSubmit={(e:React.FormEvent) => {
        e.preventDefault();
        onOpenSwapModal();
      }}>
      <FormControl>
      <RadioGroup onChange={onInputTypeChange} value={inputType}>
          <Stack marginBottom='2' direction='row'>
            <Radio value='1'>Raise interest rate</Radio>
            <Radio value='0'>Lower interest rate</Radio>
          </Stack>
        </RadioGroup>
        <FormLabel htmlFor='amount'>Input: </FormLabel>
        <InputGroup>
        <NumberInput value={input} min={0} w='100%' onChange={handleInputChange}>
          <NumberInputField />
        </NumberInput>
        <InputRightAddon>{inputSymbol}</InputRightAddon>
        </InputGroup>
        <Stack direction='row'>
          {/* <Text align='left' fontSize='12' as='i' hidden={!inputValue}>${numberWithCommas(inputValue, 2)}</Text> */}
          <Text align='right' fontSize='12' flexGrow="1">Balance: {inputBalance.toFixed(4)}</Text>
        </Stack>
        {invalidInput}
        <FormLabel htmlFor='amount'>Output: </FormLabel>
        <InputGroup>
        <NumberInput w='100%' onChange={handleOutputChange}>
          <NumberInputField placeholder={output} disabled />
        </NumberInput>
        <InputRightAddon>{outputSymbol}</InputRightAddon>
        </InputGroup>
        <Stack marginBottom='2' direction='row'>
          <Text align='left' fontSize='12' as='i' hidden={!interestRateImpact}>
            {interestRateImpact && interestRateImpact > 0 ? `Increases interest rate by ${interestRateImpactText}` : 
             interestRateImpact && interestRateImpact < 0 ? `Reduces interest rate by ${interestRateImpactText}` : ''}
          </Text>
          {/* <Text align='left' fontSize='12' as='i' hidden={!outputValue}>${numberWithCommas(outputValue, 2)} {estimatedPriceImpact && `(${estimatedPriceImpact.toFixed(2)}%)`}</Text> */}
          <Text align='right' fontSize='12' flexGrow="1">Balance: {outputBalance.toFixed(4)}</Text>
        </Stack>
        {invalidOutput}
        {slippageComponent}
        {deadlineComponent}
        <Button type="submit" isDisabled={!currentAccount || !output} isLoading={isSwapping} loadingText='Swapping'>Swap</Button>
        <Button onClick={handleAdvancedToggleChange} colorScheme='gray' size='sm' variant='link' marginLeft='4'>{advancedToggleText}</Button>
      </FormControl>
      </form>

      <Modal isOpen={isOpenSwapModal} onClose={onCloseSwapModel}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Review Swap</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Stack marginBottom='2' direction='row'>
              <Text align='left'>You pay:</Text>
              <Text align='right' flexGrow="1" as='b'>{Number(input).toFixed(4)} {inputSymbol}</Text>
            </Stack>
            <Stack marginBottom='2' direction='row'>
              <Text align='left'>You receive:</Text>
              <Text align='right' flexGrow="1" as='b'>{Number(output).toFixed(4)} {outputSymbol}</Text>
            </Stack>
            <br/>
            <Stack marginBottom='2' direction='row'>
              <Text align='left'>Interest rate impact:</Text>
              <Text align='right' flexGrow="1">{interestRateImpact ? interestRateImpactText : 'N/A'}</Text>
            </Stack>
            <Stack marginBottom='2' direction='row'>
              <Text align='left'>Max slippage:</Text>
              <Text align='right' flexGrow="1">{slippageTolerance}%</Text>
            </Stack>
            <Stack marginBottom='2' direction='row'>
              <Text align='left'>Receive at least:</Text>
              <Text align='right' flexGrow="1">{minOutput.toFixed(4)} {outputSymbol}</Text>
            </Stack>
          </ModalBody>

          <ModalFooter>
            <Button variant='ghost' mr={3} onClick={onCloseSwapModel}>
              Close
            </Button>
            <Button colorScheme='blue' onClick={convert} isLoading={isSwapping} loadingText='Confirming'>Confirm</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  )
}

export function eth(n: number) {
  return ethers.utils.parseEther(n.toString());
}

// https://stackoverflow.com/questions/2901102/how-to-format-a-number-with-commas-as-thousands-separators
export function numberWithCommas(x: number, decimals: number) {
  return x.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}