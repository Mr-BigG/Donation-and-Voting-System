/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */
import type {
  BaseContract,
  BigNumber,
  BigNumberish,
  BytesLike,
  CallOverrides,
  PopulatedTransaction,
  Signer,
  utils,
} from "ethers";
import type { FunctionFragment, Result } from "@ethersproject/abi";
import type { Listener, Provider } from "@ethersproject/providers";
import type {
  TypedEventFilter,
  TypedEvent,
  TypedListener,
  OnEvent,
  PromiseOrValue,
} from "../common";

export interface StringHelperInterface extends utils.Interface {
  functions: {
    "dec(uint256)": FunctionFragment;
    "enc(string)": FunctionFragment;
    "writeEncString(bytes,uint256,uint256,uint256,uint256,uint256)": FunctionFragment;
  };

  getFunction(
    nameOrSignatureOrTopic: "dec" | "enc" | "writeEncString"
  ): FunctionFragment;

  encodeFunctionData(
    functionFragment: "dec",
    values: [PromiseOrValue<BigNumberish>]
  ): string;
  encodeFunctionData(
    functionFragment: "enc",
    values: [PromiseOrValue<string>]
  ): string;
  encodeFunctionData(
    functionFragment: "writeEncString",
    values: [
      PromiseOrValue<BytesLike>,
      PromiseOrValue<BigNumberish>,
      PromiseOrValue<BigNumberish>,
      PromiseOrValue<BigNumberish>,
      PromiseOrValue<BigNumberish>,
      PromiseOrValue<BigNumberish>
    ]
  ): string;

  decodeFunctionResult(functionFragment: "dec", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "enc", data: BytesLike): Result;
  decodeFunctionResult(
    functionFragment: "writeEncString",
    data: BytesLike
  ): Result;

  events: {};
}

export interface StringHelper extends BaseContract {
  connect(signerOrProvider: Signer | Provider | string): this;
  attach(addressOrName: string): this;
  deployed(): Promise<this>;

  interface: StringHelperInterface;

  queryFilter<TEvent extends TypedEvent>(
    event: TypedEventFilter<TEvent>,
    fromBlockOrBlockhash?: string | number | undefined,
    toBlock?: string | number | undefined
  ): Promise<Array<TEvent>>;

  listeners<TEvent extends TypedEvent>(
    eventFilter?: TypedEventFilter<TEvent>
  ): Array<TypedListener<TEvent>>;
  listeners(eventName?: string): Array<Listener>;
  removeAllListeners<TEvent extends TypedEvent>(
    eventFilter: TypedEventFilter<TEvent>
  ): this;
  removeAllListeners(eventName?: string): this;
  off: OnEvent<this>;
  on: OnEvent<this>;
  once: OnEvent<this>;
  removeListener: OnEvent<this>;

  functions: {
    dec(
      v: PromiseOrValue<BigNumberish>,
      overrides?: CallOverrides
    ): Promise<[string]>;

    enc(
      str: PromiseOrValue<string>,
      overrides?: CallOverrides
    ): Promise<[BigNumber]>;

    writeEncString(
      buffer: PromiseOrValue<BytesLike>,
      index: PromiseOrValue<BigNumberish>,
      v: PromiseOrValue<BigNumberish>,
      start: PromiseOrValue<BigNumberish>,
      count: PromiseOrValue<BigNumberish>,
      charCase: PromiseOrValue<BigNumberish>,
      overrides?: CallOverrides
    ): Promise<[BigNumber]>;
  };

  dec(
    v: PromiseOrValue<BigNumberish>,
    overrides?: CallOverrides
  ): Promise<string>;

  enc(
    str: PromiseOrValue<string>,
    overrides?: CallOverrides
  ): Promise<BigNumber>;

  writeEncString(
    buffer: PromiseOrValue<BytesLike>,
    index: PromiseOrValue<BigNumberish>,
    v: PromiseOrValue<BigNumberish>,
    start: PromiseOrValue<BigNumberish>,
    count: PromiseOrValue<BigNumberish>,
    charCase: PromiseOrValue<BigNumberish>,
    overrides?: CallOverrides
  ): Promise<BigNumber>;

  callStatic: {
    dec(
      v: PromiseOrValue<BigNumberish>,
      overrides?: CallOverrides
    ): Promise<string>;

    enc(
      str: PromiseOrValue<string>,
      overrides?: CallOverrides
    ): Promise<BigNumber>;

    writeEncString(
      buffer: PromiseOrValue<BytesLike>,
      index: PromiseOrValue<BigNumberish>,
      v: PromiseOrValue<BigNumberish>,
      start: PromiseOrValue<BigNumberish>,
      count: PromiseOrValue<BigNumberish>,
      charCase: PromiseOrValue<BigNumberish>,
      overrides?: CallOverrides
    ): Promise<BigNumber>;
  };

  filters: {};

  estimateGas: {
    dec(
      v: PromiseOrValue<BigNumberish>,
      overrides?: CallOverrides
    ): Promise<BigNumber>;

    enc(
      str: PromiseOrValue<string>,
      overrides?: CallOverrides
    ): Promise<BigNumber>;

    writeEncString(
      buffer: PromiseOrValue<BytesLike>,
      index: PromiseOrValue<BigNumberish>,
      v: PromiseOrValue<BigNumberish>,
      start: PromiseOrValue<BigNumberish>,
      count: PromiseOrValue<BigNumberish>,
      charCase: PromiseOrValue<BigNumberish>,
      overrides?: CallOverrides
    ): Promise<BigNumber>;
  };

  populateTransaction: {
    dec(
      v: PromiseOrValue<BigNumberish>,
      overrides?: CallOverrides
    ): Promise<PopulatedTransaction>;

    enc(
      str: PromiseOrValue<string>,
      overrides?: CallOverrides
    ): Promise<PopulatedTransaction>;

    writeEncString(
      buffer: PromiseOrValue<BytesLike>,
      index: PromiseOrValue<BigNumberish>,
      v: PromiseOrValue<BigNumberish>,
      start: PromiseOrValue<BigNumberish>,
      count: PromiseOrValue<BigNumberish>,
      charCase: PromiseOrValue<BigNumberish>,
      overrides?: CallOverrides
    ): Promise<PopulatedTransaction>;
  };
}
