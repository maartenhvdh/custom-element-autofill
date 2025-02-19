import { useEffect, useLayoutEffect, useMemo } from 'react';
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
      .elementsParameter([...config.targetElement])
      .toPromise()
      .then(response => Object.entries(response.data.item.elements))
      .then(elements => new Map(elements.map(([codename, value]) => [codename, setElement(environmentId, variant.id, value.value, config)]))),
    4000);

  useEffect(() => {
    console.log('watchedElements', watchedElements);
    if (!watchedElements) {
      return;
    }
    updateElement();
    console.log('Element updated');
  }, [watchedElements, updateElement]);

  useDynamicHeight(null);

  return (
    null
  );
};

IntegrationApp.displayName = 'IntegrationApp';

const setElement = (environmentId: string, languageId: string, elementValue: string | null, config: Config) => {
  console.log('Setting element', elementValue);
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

  return managementClient
    .upsertLanguageVariant()
    .byItemCodename(config.targetElement)
    .byLanguageId(languageId)
    .withData(() => {
      return {
        elements: combinedElements
      }
    })
    .toPromise();

    return elementValue;
};

const useDynamicHeight = (renderedData: unknown) => {
  useLayoutEffect(() => {
    const newSize = Math.max(document.documentElement.offsetHeight, 100);

    CustomElement.setHeight(Math.ceil(newSize));
  }, [renderedData]); // recalculate the size when the rendered data changes
};
