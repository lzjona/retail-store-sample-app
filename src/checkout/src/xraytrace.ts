import * as process from 'process';
import * as opentelemetry from '@opentelemetry/sdk-node';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-grpc';
import { AWSXRayPropagator } from '@opentelemetry/propagator-aws-xray';
import { AWSXRayIdGenerator } from '@opentelemetry/id-generator-aws-xray';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { AwsInstrumentation } from '@opentelemetry/instrumentation-aws-sdk';

const _resource = Resource.default().merge( new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: 'retail-store-sample-app',
  }),
);
const _traceExporter = new OTLPTraceExporter();
const _spanProcessor = new BatchSpanProcessor(_traceExporter);
const _tracerConfig = {
  idGenerator: new AWSXRayIdGenerator(),
};


const xraySDK = new opentelemetry.NodeSDK({
  textMapPropagator: new AWSXRayPropagator(),
  instrumentations: [
    new HttpInstrumentation(),
    new AwsInstrumentation({
      suppressInternalInstrumentation: true
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
    .then(
      () => console.log('Tracing and Metrics terminated'),
      (err) => console.log('Error terminating tracing and metrics', err),
    )
    .finally(() => process.exit(0));
});