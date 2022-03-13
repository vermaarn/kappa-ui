import { AnnotatedPrediction } from "@tensorflow-models/face-landmarks-detection/dist/mediapipe-facemesh";
import * as tf from "@tensorflow/tfjs";

const INPUT_SIZE = 74;
const LABEL_SIZE = 2;

export function getEyesRectangle(ann: any) {
  const minX = ann[23][0] - 5;
  const maxX = ann[28][0] + 5;
  const minY = ann[24][1] - 5;
  const maxY = ann[26][1] + 5;

  const width = maxX - minX;
  const height = maxY - minY;

  return [minX, minY, width, height];
}

function flattenArr(arr: any[][]) {
  if (!arr) {
    return [];
  }
  let flatArr: any[] = [];
  arr.forEach((subarr) => {
    subarr.forEach((num) => {
      flatArr.push(num);
    });
  });
  return flatArr;
}

/**
 *
 * @param y n x 2 length array contains X and Y of the marker location on screen
 * @param x n x 372  length array that contains the the eye gaze vectors containing information on the eyes
 */
export async function trainVector(
  x: number[][],
  y: number[][],
  isTraining: boolean
) {
  const model = createModel();

  if (isTraining) {
    const { inputs, labels } = convertToTensor(x, y);
    await trainModel(model, inputs, labels);
    console.log("done training");
  } else {
    const prediction = testModel(x, model);
    return prediction;
  }

  // const inputTensor = tf.tensor2d(x, [x.length, INPUT_SIZE]);
  // const resLabel = model.predict(inputTensor) as any;

  // return Array.from(resLabel.dataSync());
}

/**
 * Convert array to tensorflow array
 *
 * @param x
 * @param y
 * @returns
 */
function convertToTensor(x: number[][], y: number[][]) {
  return tf.tidy(() => {
    const inputTensor = tf.tensor2d(x);
    const labelTensor = tf.tensor2d(y);

    //normalize the data to the range 0 - 1 using min-max scaling
    const inputMax = inputTensor.max();
    const inputMin = inputTensor.min();
    const labelMax = labelTensor.max();
    const labelMin = labelTensor.min();

    //const normalizedInputs = inputTensor
    //  .sub(inputMin)
    //  .div(inputMax.sub(inputMin));
//
    //const normalizedLabels = labelTensor
    //  .sub(labelMin)
    //  .div(labelMax.sub(labelMin));

    return {
      inputs: inputTensor,
      labels: labelTensor,
      // Return the min/max bounds so we can use them later.
      inputMax,
      inputMin,
      labelMax,
      labelMin,
    };
  });
}

function createModel() {
  // Create a sequential model
  const model = tf.sequential();

  // Add a single input layer
  model.add(
    tf.layers.dense({
      inputShape: [INPUT_SIZE],
      units: 50,
      useBias: true,
    })
  );

  model.add(tf.layers.dense({ units: 50, activation: "sigmoid" }));
  // Add an output layer
  model.add(tf.layers.dense({ units: LABEL_SIZE }));

  return model;
}

/**
 * Preparing the model for training
 *
 * @param model
 * @param inputs
 * @param labels
 * @returns
 */
async function trainModel(
  model: tf.Sequential,
  inputs: tf.Tensor<tf.Rank>,
  labels: tf.Tensor<tf.Rank>
) {
  console.log("training");
  // Prepare the model for training.
  model.compile({
    optimizer: tf.train.adam(),
    loss: tf.losses.meanSquaredError,
    metrics: ["mse"],
  });

  const batchSize = 32;
  const epochs = 50;

  return await model.fit(inputs, labels, {
    batchSize,
    epochs,
    shuffle: true,
  });
}

function testModel(xs: number[][], model: tf.Sequential) {
  const inputTensor = tf.tensor2d(xs);
  const pred = model.predict(inputTensor) as any;
  return pred.dataSync();
}

// https://github1s.com/tensorflow/tfjs-models/blob/master/face-landmarks-detection/demo/index.js
export function distance(a: any, b: any) {
  return Math.sqrt(Math.pow(a[0] - b[0], 2) + Math.pow(a[1] - b[1], 2));
}

export function createTrainVector(predictions: AnnotatedPrediction[]) {
  const NUM_KEYPOINTS = 468;
  const NUM_IRIS_KEYPOINTS = 5;

  const prediction = predictions[0];
  const keypoints = prediction.scaledMesh as any;
  const { leftEyeUpper0, leftEyeLower0, rightEyeLower0, rightEyeUpper0 } = (
    prediction as any
  ).annotations;

  const leftCenter = keypoints[NUM_KEYPOINTS];
  let leftEyeOutlineY: number[] = [];
  let leftEyeOutlineX: number[] = [];
  [leftEyeUpper0, leftEyeLower0].forEach((section) => {
    section.forEach((valSet: number[]) => {
      leftEyeOutlineY.push(valSet[1]);
      leftEyeOutlineX.push(valSet[0]);
    });
  });

  const rightCenter = keypoints[NUM_KEYPOINTS + NUM_IRIS_KEYPOINTS];
  let rightEyeOutlineY: number[] = [];
  let rightEyeOutlineX: number[] = [];
  [rightEyeLower0, rightEyeUpper0].forEach((section) => {
    section.forEach((valSet: number[]) => {
      rightEyeOutlineY.push(valSet[1]);
      rightEyeOutlineX.push(valSet[0]);
    });
  });
  const leftDiameterY = distance(
    keypoints[NUM_KEYPOINTS + 4],
    keypoints[NUM_KEYPOINTS + 2]
  );
  const leftDiameterX = distance(
    keypoints[NUM_KEYPOINTS + 3],
    keypoints[NUM_KEYPOINTS + 1]
  );
  const rightDiameterY = distance(
    keypoints[NUM_KEYPOINTS + NUM_IRIS_KEYPOINTS + 2],
    keypoints[NUM_KEYPOINTS + NUM_IRIS_KEYPOINTS + 4]
  );
  const rightDiameterX = distance(
    keypoints[NUM_KEYPOINTS + NUM_IRIS_KEYPOINTS + 3],
    keypoints[NUM_KEYPOINTS + NUM_IRIS_KEYPOINTS + 1]
  );
  const rightEye = {
    x: rightEyeOutlineX,
    y: rightEyeOutlineY,
    center: rightCenter,
  };
  const leftEye = {
    x: leftEyeOutlineX,
    y: leftEyeOutlineY,
    center: leftCenter,
  };
  const vector: number[] = [
    ...rightEye.x,
    ...rightEye.y,
    ...rightEye.center,
    rightDiameterX,
    rightDiameterY,
    ...leftEye.x,
    ...leftEye.y,
    ...leftEye.center,
    leftDiameterX,
    leftDiameterY,
  ];
  return vector;
}

export function extractEyeVector(ann: any) {
  const {
    leftEyeIris,
    leftEyeLower0,
    leftEyeLower1,
    leftEyeLower2,
    leftEyeLower3,
    leftEyeUpper0,
    leftEyeUpper1,
    leftEyeUpper2,
    rightEyeIris,
    rightEyeLower0,
    rightEyeLower1,
    rightEyeLower2,
    rightEyeLower3,
    rightEyeUpper0,
    rightEyeUpper1,
    rightEyeUpper2,
  } = ann.annotations;

  const eyeVector = [
    ...flattenArr(leftEyeIris),
    ...flattenArr(leftEyeLower0),
    ...flattenArr(leftEyeLower1),
    ...flattenArr(leftEyeLower2),
    ...flattenArr(leftEyeLower3),
    ...flattenArr(leftEyeUpper0),
    ...flattenArr(leftEyeUpper1),
    ...flattenArr(leftEyeUpper2),
    ...flattenArr(rightEyeIris),
    ...flattenArr(rightEyeLower0),
    ...flattenArr(rightEyeLower1),
    ...flattenArr(rightEyeLower2),
    ...flattenArr(rightEyeLower3),
    ...flattenArr(rightEyeUpper0),
    ...flattenArr(rightEyeUpper1),
    ...flattenArr(rightEyeUpper2),
  ];

  return eyeVector;
}
