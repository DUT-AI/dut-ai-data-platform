from dishka.integrations.fastapi import FromDishka, inject
from fastapi import APIRouter, Depends, status

from apps.api.deps.auth import CurrentUser
from apps.api.deps.ontology import require_ontology_catalog_write
from modules.ontology.dtos import (
    InputDefinitionCreateDTO,
    InputDefinitionResponseDTO,
    InputDefinitionUpdateDTO,
    OutputDefinitionCreateDTO,
    OutputDefinitionResponseDTO,
    OutputDefinitionUpdateDTO,
)
from modules.ontology.use_cases import (
    CreateInputDefinitionUseCase,
    CreateOutputDefinitionUseCase,
    DeleteInputDefinitionUseCase,
    DeleteOutputDefinitionUseCase,
    GetInputDefinitionUseCase,
    GetOutputDefinitionUseCase,
    ListInputDefinitionsUseCase,
    ListOutputDefinitionsUseCase,
    UpdateInputDefinitionUseCase,
    UpdateOutputDefinitionUseCase,
)

router = APIRouter(prefix="/ontology-definitions", tags=["Ontology Definitions"])


@router.get("/inputs", response_model=list[InputDefinitionResponseDTO])
@inject
async def list_input_definitions(
    current_user: CurrentUser, use_case: FromDishka[ListInputDefinitionsUseCase]
):
    return await use_case.execute()


@router.post(
    "/inputs",
    response_model=InputDefinitionResponseDTO,
    status_code=status.HTTP_201_CREATED,
)
@inject
async def create_input_definition(
    data: InputDefinitionCreateDTO,
    current_user: CurrentUser,
    use_case: FromDishka[CreateInputDefinitionUseCase],
    role: str = Depends(require_ontology_catalog_write),
):
    return await use_case.execute(data)


@router.get("/inputs/{definition_id}", response_model=InputDefinitionResponseDTO)
@inject
async def get_input_definition(
    definition_id: str,
    current_user: CurrentUser,
    use_case: FromDishka[GetInputDefinitionUseCase],
):
    return await use_case.execute(definition_id)


@router.patch("/inputs/{definition_id}", response_model=InputDefinitionResponseDTO)
@inject
async def update_input_definition(
    definition_id: str,
    data: InputDefinitionUpdateDTO,
    current_user: CurrentUser,
    use_case: FromDishka[UpdateInputDefinitionUseCase],
    role: str = Depends(require_ontology_catalog_write),
):
    return await use_case.execute(definition_id, data)


@router.delete("/inputs/{definition_id}", status_code=status.HTTP_204_NO_CONTENT)
@inject
async def delete_input_definition(
    definition_id: str,
    current_user: CurrentUser,
    use_case: FromDishka[DeleteInputDefinitionUseCase],
    role: str = Depends(require_ontology_catalog_write),
):
    await use_case.execute(definition_id)


@router.get("/outputs", response_model=list[OutputDefinitionResponseDTO])
@inject
async def list_output_definitions(
    current_user: CurrentUser, use_case: FromDishka[ListOutputDefinitionsUseCase]
):
    return await use_case.execute()


@router.post(
    "/outputs",
    response_model=OutputDefinitionResponseDTO,
    status_code=status.HTTP_201_CREATED,
)
@inject
async def create_output_definition(
    data: OutputDefinitionCreateDTO,
    current_user: CurrentUser,
    use_case: FromDishka[CreateOutputDefinitionUseCase],
    role: str = Depends(require_ontology_catalog_write),
):
    return await use_case.execute(data)


@router.get("/outputs/{definition_id}", response_model=OutputDefinitionResponseDTO)
@inject
async def get_output_definition(
    definition_id: str,
    current_user: CurrentUser,
    use_case: FromDishka[GetOutputDefinitionUseCase],
):
    return await use_case.execute(definition_id)


@router.patch("/outputs/{definition_id}", response_model=OutputDefinitionResponseDTO)
@inject
async def update_output_definition(
    definition_id: str,
    data: OutputDefinitionUpdateDTO,
    current_user: CurrentUser,
    use_case: FromDishka[UpdateOutputDefinitionUseCase],
    role: str = Depends(require_ontology_catalog_write),
):
    return await use_case.execute(definition_id, data)


@router.delete("/outputs/{definition_id}", status_code=status.HTTP_204_NO_CONTENT)
@inject
async def delete_output_definition(
    definition_id: str,
    current_user: CurrentUser,
    use_case: FromDishka[DeleteOutputDefinitionUseCase],
    role: str = Depends(require_ontology_catalog_write),
):
    await use_case.execute(definition_id)
