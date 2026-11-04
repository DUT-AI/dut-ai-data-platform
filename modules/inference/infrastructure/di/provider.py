from dishka import Provider, Scope, provide

from core.config import inference_settings
from core.storage.interface import IStorageProvider
from modules.inference.application.use_cases.execute_inference import (
    ExecuteInferenceUseCase,
)
from modules.inference.domain.interfaces import IRuntimeClient
from modules.inference.infrastructure.clients.grpc_client import GRPCRuntimeClient
from modules.inference.infrastructure.clients.vllm_client import VLLMRuntimeClient
from modules.inference.infrastructure.storage.prediction_storage import (
    S3PredictionStorage,
)


class InferenceProvider(Provider):
    """Dishka provider for Inference feature module."""

    scope = Scope.REQUEST

    @provide
    def get_runtime_client(self) -> IRuntimeClient:
        if inference_settings.inference_protocol.lower() == "grpc":
            return GRPCRuntimeClient()
        return VLLMRuntimeClient()

    @provide
    def get_prediction_storage(
        self, storage_provider: IStorageProvider
    ) -> S3PredictionStorage:
        return S3PredictionStorage(storage_provider=storage_provider)

    execute_inference_uc = provide(ExecuteInferenceUseCase)
