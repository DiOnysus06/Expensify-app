import {useFocusEffect} from '@react-navigation/native';
import ExpensiMark from 'expensify-common/lib/ExpensiMark';
import React, {useCallback, useRef} from 'react';
import {View} from 'react-native';
import FullPageNotFoundView from '@components/BlockingViews/FullPageNotFoundView';
import FormProvider from '@components/Form/FormProvider';
import InputWrapper from '@components/Form/InputWrapper';
import type {OnyxFormValuesFields} from '@components/Form/types';
import HeaderWithBackButton from '@components/HeaderWithBackButton';
import type {AnimatedTextInputRef} from '@components/RNTextInput';
import ScreenWrapper from '@components/ScreenWrapper';
import TextInput from '@components/TextInput';
import withCurrentUserPersonalDetails from '@components/withCurrentUserPersonalDetails';
import type {WithCurrentUserPersonalDetailsProps} from '@components/withCurrentUserPersonalDetails';
import useLocalize from '@hooks/useLocalize';
import useThemeStyles from '@hooks/useThemeStyles';
import * as ErrorUtils from '@libs/ErrorUtils';
import Navigation from '@libs/Navigation/Navigation';
import * as ReportUtils from '@libs/ReportUtils';
import StringUtils from '@libs/StringUtils';
import updateMultilineInputRange from '@libs/updateMultilineInputRange';
import withReportOrNotFound from '@pages/home/report/withReportOrNotFound';
import type {WithReportOrNotFoundProps} from '@pages/home/report/withReportOrNotFound';
import * as Task from '@userActions/Task';
import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import {isEmptyObject} from '@src/types/utils/EmptyObject';

type TaskDescriptionPageProps = WithReportOrNotFoundProps & WithCurrentUserPersonalDetailsProps;

type Values = {
    description: string;
};

type Errors = {
    description?: string;
};

const parser = new ExpensiMark();

function TaskDescriptionPage({report, currentUserPersonalDetails}: TaskDescriptionPageProps) {
    const styles = useThemeStyles();
    const {translate} = useLocalize();

    const validate = useCallback((values: Values): Errors => {
        const errors = {};

        if (values.description.length > CONST.DESCRIPTION_LIMIT) {
            ErrorUtils.addErrorMessage(errors, 'description', ['common.error.characterLimitExceedCounter', {length: values.description.length, limit: CONST.DESCRIPTION_LIMIT}]);
        }

        return errors;
    }, []);

    const submit = useCallback(
        (values: OnyxFormValuesFields<typeof ONYXKEYS.FORMS.EDIT_TASK_FORM>) => {
            // report.description might contain CRLF from the server
            if (StringUtils.normalizeCRLF(values.description) !== StringUtils.normalizeCRLF(report?.description) && !isEmptyObject(report)) {
                // Set the description of the report in the store and then call EditTask API
                // to update the description of the report on the server
                Task.editTask(report, {description: values.description});
            }

            Navigation.dismissModal(report?.reportID);
        },
        [report],
    );

    if (!ReportUtils.isTaskReport(report)) {
        Navigation.isNavigationReady().then(() => {
            Navigation.dismissModal(report?.reportID);
        });
    }
    const inputRef = useRef<AnimatedTextInputRef | null>(null);
    const focusTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const isOpen = ReportUtils.isOpenTaskReport(report);
    const canModifyTask = Task.canModifyTask(report, currentUserPersonalDetails.accountID);
    const isTaskNonEditable = ReportUtils.isTaskReport(report) && (!canModifyTask || !isOpen);

    useFocusEffect(
        useCallback(() => {
            focusTimeoutRef.current = setTimeout(() => {
                if (inputRef.current) {
                    inputRef.current.focus();
                }
                return () => {
                    if (!focusTimeoutRef.current) {
                        return;
                    }
                    clearTimeout(focusTimeoutRef.current);
                };
            }, CONST.ANIMATED_TRANSITION);
        }, []),
    );

    return (
        <ScreenWrapper
            includeSafeAreaPaddingBottom={false}
            shouldEnableMaxHeight
            testID={TaskDescriptionPage.displayName}
        >
            <FullPageNotFoundView shouldShow={isTaskNonEditable}>
                <HeaderWithBackButton title={translate('task.task')} />
                <FormProvider
                    style={[styles.flexGrow1, styles.ph5]}
                    formID={ONYXKEYS.FORMS.EDIT_TASK_FORM}
                    validate={validate}
                    onSubmit={submit}
                    submitButtonText={translate('common.save')}
                    enabledWhenOffline
                >
                    <View style={[styles.mb4]}>
                        <InputWrapper
                            InputComponent={TextInput}
                            role={CONST.ROLE.PRESENTATION}
                            inputID="description"
                            name="description"
                            label={translate('newTaskPage.descriptionOptional')}
                            accessibilityLabel={translate('newTaskPage.descriptionOptional')}
                            defaultValue={parser.htmlToMarkdown((report && parser.replace(report?.description ?? '')) ?? '')}
                            ref={(element: AnimatedTextInputRef) => {
                                if (!element) {
                                    return;
                                }
                                inputRef.current = element;
                                updateMultilineInputRange(inputRef.current);
                            }}
                            autoGrowHeight
                            shouldSubmitForm
                            containerStyles={[styles.autoGrowHeightMultilineInput]}
                        />
                    </View>
                </FormProvider>
            </FullPageNotFoundView>
        </ScreenWrapper>
    );
}

TaskDescriptionPage.displayName = 'TaskDescriptionPage';

const ComponentWithCurrentUserPersonalDetails = withCurrentUserPersonalDetails(TaskDescriptionPage);

export default withReportOrNotFound()(ComponentWithCurrentUserPersonalDetails);
