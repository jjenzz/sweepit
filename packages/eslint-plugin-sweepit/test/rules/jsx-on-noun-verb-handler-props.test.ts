import { describe, it } from 'vitest';
import { RuleTester } from 'eslint';
import rule from '../../src/rules/jsx-on-noun-verb-handler-props';
import tsParser from '@typescript-eslint/parser';

RuleTester.describe = describe;
RuleTester.it = it;

const ruleTester = new RuleTester({
  languageOptions: {
    parser: tsParser,
    parserOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      ecmaFeatures: { jsx: true },
    },
  },
});

describe('jsx-on-noun-verb-handler-props', () => {
  ruleTester.run('jsx-on-noun-verb-handler-props', rule, {
    valid: [
      '<Input onValueChange={handleChange} />',
      '<Form onFormSubmit={handleSubmit} />',
      '<Modal onModalClose={handleClose} />',
      '<Select onOptionChange={handleChange} />',
      '<Button onButtonClick={handleClick} />',
      '<button onClick={handleClick} />',
      '<input onChange={handleChange} />',
      '<input onFocus={handleFocus} onBlur={handleBlur} />',
      '<Input onInputChange={handleInput} />',
      '<Dropdown onOptionSelect={handleSelect} />',
      '<Dialog onDialogOpen={handleOpen} />',
      '<Toggle onToggleChange={handleToggle} />',
      '<FeatureFlag onFeatureDisable={handleDisable} />',
      '<FeatureFlag onFeatureDisabled={handleDisabled} />',
      '<input onKeyDown={handleKeyDown} onKeyUp={handleKeyUp} />',
      '<div onSomethingCustom={handler} />',
      {
        code: '<Item onItemArchived={handleArchived} />',
        options: [{ allowedVerbs: ['Archived'], allowedNouns: ['Item'] }],
      },
    ],
    invalid: [
      {
        code: '<Input onChangeValue={handleChange} />',
        errors: [
          {
            messageId: 'preferNounVerb',
            data: { prop: 'onChangeValue', suggestion: 'onValueChange' },
          },
        ],
      },
      {
        code: '<Form onSubmitForm={handleSubmit} />',
        errors: [
          {
            messageId: 'preferNounVerb',
            data: { prop: 'onSubmitForm', suggestion: 'onFormSubmit' },
          },
        ],
      },
      {
        code: '<Modal onCloseModal={handleClose} />',
        errors: [
          {
            messageId: 'preferNounVerb',
            data: { prop: 'onCloseModal', suggestion: 'onModalClose' },
          },
        ],
      },
      {
        code: '<Select onChangeOption={handleChange} />',
        errors: [
          {
            messageId: 'preferNounVerb',
            data: { prop: 'onChangeOption', suggestion: 'onOptionChange' },
          },
        ],
      },
      {
        code: '<Button onClickButton={handleClick} />',
        errors: [
          {
            messageId: 'preferNounVerb',
            data: { prop: 'onClickButton', suggestion: 'onButtonClick' },
          },
        ],
      },
      {
        code: '<Input onFocusInput={handleFocus} />',
        errors: [
          {
            messageId: 'preferNounVerb',
            data: { prop: 'onFocusInput', suggestion: 'onInputFocus' },
          },
        ],
      },
      {
        code: '<Input onBlurInput={handleBlur} />',
        errors: [
          {
            messageId: 'preferNounVerb',
            data: { prop: 'onBlurInput', suggestion: 'onInputBlur' },
          },
        ],
      },
      {
        code: '<Dropdown onSelectOption={handleSelect} />',
        errors: [
          {
            messageId: 'preferNounVerb',
            data: { prop: 'onSelectOption', suggestion: 'onOptionSelect' },
          },
        ],
      },
      {
        code: '<Dialog onOpenDialog={handleOpen} />',
        errors: [
          {
            messageId: 'preferNounVerb',
            data: { prop: 'onOpenDialog', suggestion: 'onDialogOpen' },
          },
        ],
      },
      {
        code: '<Toggle onChangeToggle={handleToggle} />',
        errors: [
          {
            messageId: 'preferNounVerb',
            data: { prop: 'onChangeToggle', suggestion: 'onToggleChange' },
          },
        ],
      },
      {
        code: '<FeatureFlag onDisableFeature={handleDisable} />',
        errors: [
          {
            messageId: 'preferNounVerb',
            data: {
              prop: 'onDisableFeature',
              suggestion: 'onFeatureDisable',
            },
          },
        ],
      },
      {
        code: '<FeatureFlag onDisabledFeature={handleDisabled} />',
        errors: [
          {
            messageId: 'preferNounVerb',
            data: {
              prop: 'onDisabledFeature',
              suggestion: 'onFeatureDisabled',
            },
          },
        ],
      },
      {
        code: '<Item onArchivedItem={handleArchived} />',
        options: [{ allowedVerbs: ['Archived'], allowedNouns: ['Item'] }],
        errors: [
          {
            messageId: 'preferNounVerb',
            data: { prop: 'onArchivedItem', suggestion: 'onItemArchived' },
          },
        ],
      },
    ],
  });
});
