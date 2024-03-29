import React from 'react';
import { Lottie } from '@crello/react-lottie';
import animationData from '../Lottie/fireworks.json';

export const BasicLottieComponent = (props) => <Lottie key={ props.mykey } width="80px" height="80px" style={{ display: 'inline-block' }} config={{ animationData: animationData, loop: true, autoplay: true, currentAlgorithmSteps: props.currentAlgorithmSteps }}></Lottie>

