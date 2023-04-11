import { CompositePropagator } from '@opentelemetry/core';
import { SimpleSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { B3InjectEncoding, B3Propagator } from '@opentelemetry/propagator-b3';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { AsyncLocalStorageContextManager } from '@opentelemetry/context-async-hooks';
import * as process from 'process';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-grpc';
import { awsEc2Detector } from '@opentelemetry/resource-detector-aws';
import { envDetector } from '@opentelemetry/resources';

import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { AWSXRayPropagator } from '@opentelemetry/propagator-aws-xray';
import { AWSXRayIdGenerator } from '@opentelemetry/id-generator-aws-xray';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { AwsInstrumentation } from '@opentelemetry/instrumentation-aws-sdk';

const _resource = Resource.default().merge(
  new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: 'retail-store-sample-app',
  }),
);
const _traceExporter = new OTLPTraceExporter();
const _spanProcessor = new SimpleSpanProcessor(_traceExporter);
const _tracerConfig = { idGenerator: new AWSXRayIdGenerator() };

const xraySDK = new NodeSDK({
  textMapPropagator: new AWSXRayPropagator(),
  instrumentations: [
    new HttpInstrumentation(),
    new AwsInstrumentation({
      suppressInternalInstrumentation: true,
    }),
  ],
  resource: _resource,
  spanProcessor: _spanProcessor,
  traceExporter: _traceExporter,
});

xraySDK.configureTracerProvider(_tracerConfig, _spanProcessor);

export default xraySDK;

// gracefully shut down the SDK on process exit
process.on('SIGTERM', () => {
  xraySDK
    .shutdown()
    .then(() => console.log('Tracing and Metrics terminated'))
    .catch((error) =>
      console.log('Error terminating tracing and metrics', error),
    )
    .finally(() => process.exit(0));
});
