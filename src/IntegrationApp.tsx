import { useEffect, useMemo } from 'react';
import { useConfig, useItemInfo, useEnvironmentId, useVariantInfo } from './customElement/CustomElementContext';
import { useElements } from './customElement/selectors';
import { DeliveryClient } from '@kontent-ai/delivery-sdk';
import { Config } from './customElement/config';
import { useDebouncedCallback } from 'use-debounce';
import { LanguageVariantElements, LanguageVariantElementsBuilder, ManagementClient } from '@kontent-ai/management-sdk';

export const IntegrationApp = () => {
  const config = useConfig();
  const environmentId = useEnvironmentId();
  const item = useItemInfo();
  const variant = useVariantInfo();

  const deliveryClient = useMemo(() =>
    new DeliveryClient({ environmentId, previewApiKey: config.previewApiKey, defaultQueryConfig: { usePreviewMode: true, waitForLoadingNewContent: true } })
    , [environmentId, config.previewApiKey]);

  const watchedElements = useElements([config.sourceElement]);

  const updateElement = useDebouncedCallback(() =>
    deliveryClient
      .item(item.codename)
      .languageParameter(variant.codename)
      .toPromise()
      .then(response => {
        const elements = response.data.item.elements;
        const value = elements?.[config.sourceElement]?.value; // Correct element access
        setElement(environmentId, variant.id, value, item.name, item.codename, config);
      })
  , 4000);

  useEffect(() => {
    if (!watchedElements) {
      return;
    }
    updateElement();
  }, [watchedElements, updateElement]);

  useEffect(() => {
    CustomElement.observeItemChanges(() => {
      updateElement();
    });
  }, [updateElement]);

  CustomElement.setHeight(0);

  return (
    null
  );
};

IntegrationApp.displayName = 'IntegrationApp';

const setElement = (environmentId: string, languageId: string, elementValue: string | null, itemName: string | null, itemCodeName: string, config: Config) => {
  if (!elementValue) {
    return null;
  }

  const managementClient = new ManagementClient({
    environmentId: environmentId,
    apiKey: config.managementApiKey,
  });

  const combinedElements: Array<LanguageVariantElements.ILanguageVariantElementBase> = [];
  const builder = new LanguageVariantElementsBuilder();
      combinedElements.push(
        builder.textElement({
          element: {
            codename: config.targetElement,
          },
          value: elementValue
        }));

  if (itemName) {
    combinedElements.push(
      builder.textElement({
        element: {
          codename: config.nameElement,
        },
        value: itemName
      }));
  }

  return managementClient
    .upsertLanguageVariant()
    .byItemCodename(itemCodeName)
    .byLanguageId(languageId)
    .withData(() => {
      return {
        elements: combinedElements
      }
    })
    .toPromise();
};