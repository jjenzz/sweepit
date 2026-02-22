import { describe, it } from "vitest";
import { RuleTester } from "eslint";
import rule from "../../src/rules/jsx-on-handler-verb-suffix";
import tsParser from "@typescript-eslint/parser";

RuleTester.describe = describe;
RuleTester.it = it;

const ruleTester = new RuleTester({
	languageOptions: {
		parser: tsParser,
		parserOptions: {
			ecmaVersion: "latest",
			sourceType: "module",
			ecmaFeatures: { jsx: true },
		},
	},
});

describe("jsx-on-handler-verb-suffix", () => {
	ruleTester.run("jsx-on-handler-verb-suffix", rule, {
		valid: [
			"<Input onValueChange={handleChange} />",
			"<Form onFormSubmit={handleSubmit} />",
			"<Modal onModalClose={handleClose} />",
			"<Select onOptionChange={handleChange} />",
			"<Button onButtonClick={handleClick} />",
			"<button onClick={handleClick} />",
			"<input onChange={handleChange} />",
			"<input onFocus={handleFocus} onBlur={handleBlur} />",
			"<Input onInputValidate={handleValidate} />",
			"<Dropdown onOptionSelect={handleSelect} />",
			"<Dialog onDialogOpen={handleOpen} />",
			"<Toggle onToggleChange={handleToggle} />",
			"<FeatureFlag onFeatureDisable={handleDisable} />",
			"<input onKeyDown={handleKeyDown} onKeyUp={handleKeyUp} />",
			{
				code: "<Item onItemArchived={handleArchived} />",
				options: [{ extendVerbs: ["Archived"] }],
			},
			{
				code: "<Item onItemArchived={handleArchived} />",
				options: [{ extendVerbs: ["archived"] }],
			},
			{
				code: "<Item onItemArchived={handleArchived} />",
				options: [{ extendVerbs: ["ArChIvEd"] }],
			},
			{
				code: "<Input onValueArchived={handleArchived} />",
				options: [{ extendVerbs: ["archived"] }],
			},
		],
		invalid: [
			{
				code: "<Input onChangeValue={handleChange} />",
				errors: [
					{
						messageId: "preferVerbSuffix",
						data: { prop: "onChangeValue", suggestion: "onValueChange" },
					},
				],
			},
			{
				code: "<Form onSubmitForm={handleSubmit} />",
				errors: [
					{
						messageId: "preferVerbSuffix",
						data: { prop: "onSubmitForm", suggestion: "onFormSubmit" },
					},
				],
			},
			{
				code: "<Modal onCloseModal={handleClose} />",
				errors: [
					{
						messageId: "preferVerbSuffix",
						data: { prop: "onCloseModal", suggestion: "onModalClose" },
					},
				],
			},
			{
				code: "<Select onChangeOption={handleChange} />",
				errors: [
					{
						messageId: "preferVerbSuffix",
						data: { prop: "onChangeOption", suggestion: "onOptionChange" },
					},
				],
			},
			{
				code: "<Button onClickButton={handleClick} />",
				errors: [
					{
						messageId: "preferVerbSuffix",
						data: { prop: "onClickButton", suggestion: "onButtonClick" },
					},
				],
			},
			{
				code: "<Input onHoverState={handleHover} />",
				errors: [
					{
						messageId: "preferVerbSuffix",
						data: { prop: "onHoverState", suggestion: "onStateHover" },
					},
				],
			},
			{
				code: "<Dropdown onSelectOption={handleSelect} />",
				errors: [
					{
						messageId: "preferVerbSuffix",
						data: { prop: "onSelectOption", suggestion: "onOptionSelect" },
					},
				],
			},
			{
				code: "<Dialog onOpenDialog={handleOpen} />",
				errors: [
					{
						messageId: "preferVerbSuffix",
						data: { prop: "onOpenDialog", suggestion: "onDialogOpen" },
					},
				],
			},
			{
				code: "<Toggle onChangeToggle={handleToggle} />",
				errors: [
					{
						messageId: "preferVerbSuffix",
						data: { prop: "onChangeToggle", suggestion: "onToggleChange" },
					},
				],
			},
			{
				code: "<FeatureFlag onDisableFeature={handleDisable} />",
				errors: [
					{
						messageId: "preferVerbSuffix",
						data: {
							prop: "onDisableFeature",
							suggestion: "onFeatureDisable",
						},
					},
				],
			},
			{
				code: "<FeatureFlag onDisabledFeature={handleDisabled} />",
				errors: [
					{
						messageId: "mustEndWithVerb",
						data: { prop: "onDisabledFeature" },
					},
				],
			},
			{
				code: "<FeatureFlag onFeatureDisabled={handleDisabled} />",
				errors: [
					{
						messageId: "mustEndWithVerb",
						data: { prop: "onFeatureDisabled" },
					},
				],
			},
			{
				code: "<div onSomethingCustom={handler} />",
				errors: [
					{
						messageId: "mustEndWithVerb",
						data: { prop: "onSomethingCustom" },
					},
				],
			},
			{
				code: "<Item onArchivedItem={handleArchived} />",
				options: [{ extendVerbs: ["Archived"] }],
				errors: [
					{
						messageId: "preferVerbSuffix",
						data: { prop: "onArchivedItem", suggestion: "onItemArchived" },
					},
				],
			},
			{
				code: "<Input onValueThing={handleThing} />",
				errors: [
					{
						messageId: "mustEndWithVerb",
						data: { prop: "onValueThing" },
					},
				],
			},
			{
				code: "<Input onValueArchived={handleArchived} />",
				errors: [
					{
						messageId: "mustEndWithVerb",
						data: { prop: "onValueArchived" },
					},
				],
			},
		],
	});
});
