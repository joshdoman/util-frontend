// src/component/TransferERC20.tsx
import React, { useEffect, useState } from 'react'
import {Alert, AlertIcon, Button, Input , NumberInput,  NumberInputField,  FormControl,  FormLabel, Radio, RadioGroup, Spinner, Stack, InputGroup, NumberInputStepper, NumberIncrementStepper, NumberDecrementStepper, Text, InputRightAddon } from '@chakra-ui/react'
import {BigNumber, ethers} from 'ethers'
import {formatEther, isAddress, parseEther} from 'ethers/lib/utils'
import { UtilABI as utilABI } from 'abi/UtilABI'
import { ERC20ABI as erc20ABI } from 'abi/ERC20ABI'
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

interface Props {
    utilContract: string,
    token0Symbol: string,
    token1Symbol: string,
    currentAccount: string | undefined,
    baseBalance: any,
    token0Balance: any,
    token1Balance: any,
    token0Contract: string,
    token1Contract: string,
    quote: number | undefined,
    queryBaseBalance: () => void,
    queryToken0Balance: () => void,
    queryToken1Balance: () => void,
}

declare let window: any;

export default function Convert(props:Props){
  const satsPerBTC = 100000000;
  const utilContract = props.utilContract;
  const currentAccount = props.currentAccount;
  const baseBalance = Number(props.baseBalance ?? '0') * satsPerBTC;
  const token0Balance = Number(props.token0Balance ?? '0');
  const token1Balance = Number(props.token1Balance ?? '0');
  const token0Contract = props.token0Contract;
  const token1Contract = props.token1Contract;
  var quote = props.quote;
  
  const [inputType, setInputType] = React.useState<string>('0')
  const [toAddress, setToAddress] = React.useState<string>('')
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false)
  const [input,setInput]=useState<string>('')
  const [slippageTolerance,setSlippageTolerance]=useState<string>('0.10')
  const [deadline,setDeadline]=useState<string>('10')
  const [isInvalidInput, setIsInvalidInput]=useState<boolean>(false)

  const [isTransferring, setIsTransferring]=useState<boolean>(false)
  const { isOpen: isOpenModal, onOpen: onOpenModal, onClose: onCloseModal } = useDisclosure()

  var maxBTCAmount = (Number(input) / (quote ?? 1) / (1 - Number(slippageTolerance) / 100));

  async function transfer() {
    if(!window.ethereum) return
    if(!utilContract) return

    const provider = new ethers.providers.Web3Provider(window.ethereum)
    const signer = provider.getSigner()
    const inputAmount = parseEther(input);

    try {
      // Add 10% margin to gas estimate to ensure sufficient gas
      const gasMargin = 1.1;

      let tr: TransactionResponse;
      if (inputType == '0') {
        const util = new ethers.Contract(utilContract, utilABI, signer);
        const now = new Date()
        var expiry = Math.trunc(now.getTime() / 1000) + Number(deadline) * 60
        const deadlineValue = BigNumber.from(expiry);
        quote = Number(formatEther(await util.quote()));
        maxBTCAmount = Number(input) / (quote ?? 1) / (1 - Number(slippageTolerance) / 100);
        const maxValue = parseEther(maxBTCAmount.toFixed(18)).div(satsPerBTC);
        const gasEstimated = await util.estimateGas.transfer(toAddress, inputAmount, deadlineValue, { value: maxValue });
        tr = await util.transfer(toAddress, inputAmount, deadlineValue, { value: maxValue, gasLimit: Math.ceil(gasEstimated.toNumber() * gasMargin) });
      } else if (inputType == '1') {
        const erc20 = new ethers.Contract(token0Contract, erc20ABI, signer);
        const gasEstimated = await erc20.estimateGas.transfer(toAddress, inputAmount);
        tr = await erc20.transfer(toAddress, inputAmount, { gasLimit: Math.ceil(gasEstimated.toNumber() * gasMargin) });
      } else {
        const erc20 = new ethers.Contract(token1Contract, erc20ABI, signer);
        const gasEstimated = await erc20.estimateGas.transfer(toAddress, inputAmount);
        tr = await erc20.transfer(toAddress, inputAmount, { gasLimit: Math.ceil(gasEstimated.toNumber() * gasMargin) });
      }
      setIsTransferring(true);
      console.log(`TransactionResponse TX hash: ${tr.hash}`);
      const receipt: TransactionReceipt = await tr.wait();
      console.log("transfer receipt",receipt);
      if (inputType == '0') {
        props.queryBaseBalance();
      } else if (inputType == '1') {
        props.queryToken0Balance();
      } else {
        props.queryToken1Balance();
      }
      clearAmounts();
      onCloseModal();
    } catch (e:any) {
      console.error(e);
    } finally {
      setIsTransferring(false)
    }
  }

  function clearAmounts() {
    setInput("")
    setIsInvalidInput(false)
  }

  function onInputTypeChange(value:string) {
    setInputType(value);
  }

  const handleInputChange = (value:string) => setInput(value)
  const handleToChange = (event:any) => setToAddress(event.target.value)
  const handleSlippageChange = (value:string) => setSlippageTolerance(value)
  const handleDeadlineChange = (value:string) => setDeadline(value)
  const handleAdvancedToggleChange = () => setShowAdvanced(!showAdvanced)

  const invalidInput = isInvalidInput ? (
    <Alert status='error'>
      <AlertIcon />
      Input too large
    </Alert>
  ) : null

  const slippageComponent = showAdvanced && inputType == '0' ? (
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

  const deadlineComponent = showAdvanced && inputType == '0' ? (
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

  let balanceText: string;
  let symbol: string;
  if (inputType == '0') {
    symbol = 'utils';
    let balance = quote ? baseBalance * quote : 0;
    balanceText = balance.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  } else if (inputType == '1') {
    symbol = props.token0Symbol;
    balanceText = token0Balance.toFixed(4);
  } else if (inputType == '2') {
    symbol = props.token1Symbol;
    balanceText = token1Balance.toFixed(4);
  } else {
    symbol = '';
    balanceText = '';
  }

  return (
    <div>
      <form onSubmit={(e:React.FormEvent) => {
        e.preventDefault();
        if (inputType == '0') onOpenModal();
        else transfer();
      }}>
      <FormControl>
        <RadioGroup onChange={onInputTypeChange} value={inputType}>
          <Stack marginBottom='2' direction='row'>
            <Radio value='0'>Utils</Radio>
            <Radio value='1'>Tighten</Radio>
            <Radio value='2'>Ease</Radio>
          </Stack>
        </RadioGroup>
        <FormLabel htmlFor='amount'>Amount: </FormLabel>
        <InputGroup>
        <NumberInput value={input} min={0} w='100%' onChange={handleInputChange}>
          <NumberInputField />
        </NumberInput>
        <InputRightAddon>{symbol}</InputRightAddon>
        </InputGroup>
        <Stack direction='row'>
          <Text align='right' fontSize='12' flexGrow="1">Balance: {balanceText}</Text>
        </Stack>
        <FormLabel htmlFor='amount'>To: </FormLabel>
        <InputGroup marginBottom='4'>
        <Input min={0} w='100%' placeholder='0x00000000...' value={toAddress} onChange={handleToChange} />
        </InputGroup>
        {invalidInput}
        {slippageComponent}
        {deadlineComponent}
        <Button type="submit" isDisabled={!currentAccount || !input || !isAddress(toAddress)} isLoading={isTransferring} loadingText='Transferring'>Transfer</Button>
        <Button onClick={handleAdvancedToggleChange} colorScheme='gray' size='sm' variant='link' marginLeft='4' hidden={inputType != '0'}>{advancedToggleText}</Button>
      </FormControl>
      </form>

      <Modal isOpen={isOpenModal} onClose={onCloseModal}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Review Transfer</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Stack marginBottom='2' direction='row'>
              <Text align='left'>You pay:</Text>
              <Text align='right' flexGrow="1" as='b'>{Number(input).toFixed(4)} {symbol}</Text>
            </Stack>
            <Stack marginBottom='2' direction='row'>
              <Text align='left'>To:</Text>
              <Text align='right' flexGrow="1" as='b' noOfLines={1}>{toAddress}</Text>
            </Stack>
            {
              inputType == '0' && (
                <>
                <br/>
                <Stack marginBottom='2' direction='row'>
                  <Text align='left'>Expected amount of sats:</Text>
                  <Text align='right' flexGrow="1">{(Number(input) / (quote ?? 1)).toFixed(4)} sats</Text>
                </Stack>
                <Stack marginBottom='2' direction='row'>
                  <Text align='left'>Slippage tolerance:</Text>
                  <Text align='right' flexGrow="1">{slippageTolerance}%</Text>
                </Stack>
                <Stack marginBottom='2' direction='row'>
                  <Text align='left'>Maximum amount of sats:</Text>
                  <Text align='right' flexGrow="1">{maxBTCAmount.toFixed(4)} sats</Text>
                </Stack>
                </>
              )
            }
          </ModalBody>

          <ModalFooter>
            <Button variant='ghost' mr={3} onClick={onCloseModal}>
              Close
            </Button>
            <Button colorScheme='blue' onClick={transfer} isLoading={isTransferring} loadingText='Confirming'>Confirm</Button>
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