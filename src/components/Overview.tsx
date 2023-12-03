// src/component/Overview.tsx
import {Box, Flex, Spacer, Text } from '@chakra-ui/react'
import {ethers} from 'ethers'

interface Props {
    peerFedContract: string,
    token0Symbol: string,
    token1Symbol: string,
    accumulator: number | undefined,
    checkpointInterestRate: number | undefined,
    quote: number | undefined,
    interestRate: number | undefined,
    token0Supply: number | undefined,
    token1Supply: number | undefined,
    blockTimestampLast: number | undefined,
}

export default function Overview(props:Props) {
  const token0Symbol = props.token0Symbol
  const token1Symbol = props.token1Symbol
  const accumulator = props.accumulator;
  const checkpointInterestRate = props.checkpointInterestRate;
  const quote = props.quote;
  const interestRate = props.interestRate;
  const token0Supply = props.token0Supply;
  const token1Supply = props.token1Supply;

  const token0SupplyText = token0Supply != undefined ? token0Supply.toFixed(4) : 'N/A';
  const token1SupplyText = token1Supply != undefined ? token1Supply.toFixed(4) : 'N/A';
  const accumulatorText = accumulator ? accumulator.toFixed(8) + ' e-bonds' : 'N/A';
  const unitsPerBond = checkpointInterestRate != undefined ? Number(1 / checkpointInterestRate).toFixed(8) + ' utils' : 'N/A';
  const quoteText = quote != undefined ? quote.toFixed(8) + ' utils' : 'N/A';
  const interestRateText = interestRate != undefined ? Number(interestRate * 100).toFixed(2) + '%' : 'N/A';

  return (
    <div>
      <Flex marginBottom='2' direction='row'>
        <Box>
          <Text as='u'>Token supply</Text>
          <Text>{token0SupplyText} {token0Symbol}</Text>
          <Text>{token1SupplyText} {token1Symbol}</Text>
          <Text as='b'>Interest rate: {interestRateText}</Text>
        </Box>
        <Spacer />
        <Box flexGrow="1">
          <Text as='u'>Accounting</Text>
          <Text>1 BTC = {accumulatorText}</Text>
          <Text>1 e-bond = {unitsPerBond} </Text>
          <Text as='b'>1 BTC = {quoteText}</Text>
        </Box>
      </Flex>
      <Text marginTop='8' as='i' fontSize='sm'>E-bonds per BTC grows at the current interest rate</Text>
      <br/>
      <Text as='i' fontSize='sm'>Utils per e-bond = 1 / (average interest rate over the preceding 8 hours)</Text>
    </div>
  )
}

export function eth(n: number) {
  return ethers.utils.parseEther(n.toString());
}