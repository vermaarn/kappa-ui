import { AnnotatedPrediction } from "@tensorflow-models/face-landmarks-detection/dist/mediapipe-facemesh";
import * as tf from "@tensorflow/tfjs";

/**
 *
 */
export async function trainEyeBoxTensor(
  datasetArr: any,
  isTraining: boolean,
  eyeBoxShape?: number[]
) {
  if (!eyeBoxShape) return;
  const model = createModel(eyeBoxShape);

  if (isTraining) {
    const dataset = {
      train: {
        n: datasetArr.train.n,
        x: tf.tensor4d(datasetArr.train.x),
        y: tf.tensor2d(datasetArr.train.y),
      },
      val: {
        n: datasetArr.val.n,
        x: tf.tensor4d(datasetArr.val.x),
        y: tf.tensor2d(datasetArr.val.y),
      },
    };
    console.log("tfdata", dataset);
    await trainModel(model, dataset);
    console.log("done training");
  } else {
    const imgTensor = tf.tensor4d(datasetArr.train.x);
    const prediction = testModel(imgTensor, model);

    return prediction;
  }
}

/**
 * Preparing the model for training
 *
 * @param model
 * @param inputs
 * @param labels
 * @returns
 */
async function trainModel(model: tf.Sequential, dataset: any) {
  console.log("training");
  // Prepare the model for training.
  model.compile({
    optimizer: tf.train.adam(0.0005),
    loss: tf.losses.meanSquaredError,
    metrics: ["mse"],
  });

  let batchSize = Math.floor(dataset.train.n * 0.1);
  if (batchSize < 4) {
    batchSize = 4;
  } else if (batchSize > 64) {
    batchSize = 64;
  }

  return await model.fit(dataset.train.x, dataset.train.y, {
    batchSize: batchSize,
    epochs: 20,
    shuffle: true,
    validationData: [dataset.val.x, dataset.val.y],
  });
}

function createModel(inputShape: number[]) {
  const model = tf.sequential();

  model.add(
    tf.layers.conv2d({
      kernelSize: 5,
      filters: 20,
      strides: 1,
      activation: "relu",
      inputShape,
    })
  );

  model.add(
    tf.layers.averagePooling2d({
      poolSize: [2, 2],
      strides: [2, 2],
    })
  );

  model.add(
    tf.layers.conv2d({
      kernelSize: 5,
      filters: 20,
      strides: 1,
      activation: "relu",
      inputShape,
    })
  );

  model.add(
    tf.layers.averagePooling2d({
      poolSize: [2, 2],
      strides: [2, 2],
    })
  );

  model.add(tf.layers.flatten());

  model.add(
    tf.layers.conv2d({
      kernelSize: 5,
      filters: 20,
      strides: 1,
      activation: "relu",
      inputShape,
    })
  );

  model.add(
    tf.layers.dense({
      units: 128,
      activation: "relu",
      inputShape,
    })
  );

  model.add(
    tf.layers.dense({
      units: 128,
      activation: "relu",
      inputShape,
    })
  );

  model.add(
    tf.layers.dense({
      units: 2,
      inputShape,
    })
  );

  model.add(tf.layers.dropout({ rate: 0.2 }));

  // Two output values x and y
  // model.add(
  //   tf.layers.dense({
  //     units: 2,
  //     activation: "tanh",
  //   })
  // );

  return model;
}

function testModel(xs: any, model: tf.Sequential) {
  const pred = model.predict(xs) as any;
  return pred.data();
}

// https://cpury.github.io/learning-where-you-are-looking-at/
export function findEyeBox(prediction: AnnotatedPrediction) {
  const { leftEyeUpper0, leftEyeLower0, rightEyeLower0, rightEyeUpper0 } = (
    prediction as any
  ).annotations;

  let leftEyeOutlineY: number[] = [];
  let leftEyeOutlineX: number[] = [];
  [leftEyeUpper0, leftEyeLower0].forEach((section) => {
    section.forEach((valSet: number[]) => {
      leftEyeOutlineY.push(valSet[1]);
      leftEyeOutlineX.push(valSet[0]);
    });
  });

  let rightEyeOutlineY: number[] = [];
  let rightEyeOutlineX: number[] = [];
  [rightEyeLower0, rightEyeUpper0].forEach((section) => {
    section.forEach((valSet: number[]) => {
      rightEyeOutlineY.push(valSet[1]);
      rightEyeOutlineX.push(valSet[0]);
    });
  });
  const NUM_KEYPOINTS = 468;
  const NUM_IRIS_KEYPOINTS = 5;
  const keypoints = prediction.scaledMesh as any;
  const [leftCenterX, leftCenterY]: number[] = keypoints[NUM_KEYPOINTS];
  const [rightCenterX, rightCenterY]: number[] =
    keypoints[NUM_KEYPOINTS + NUM_IRIS_KEYPOINTS];

  const xRange = [
    ...leftEyeOutlineX,
    ...rightEyeOutlineX,
    leftCenterX,
    rightCenterX,
  ];
  const yRange = [
    ...leftEyeOutlineY,
    ...rightEyeOutlineY,
    leftCenterY,
    rightCenterY,
  ];
  const minX = Math.min(...xRange) - 5;
  const maxX = Math.max(...xRange) + 5;
  const minY = Math.min(...yRange) - 5;
  const maxY = Math.max(...yRange) + 5;

  const width = maxX - minX;
  const height = maxY - minY;

  return [minX, minY, width, height];
}
