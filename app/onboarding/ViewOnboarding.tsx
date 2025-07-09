import { ArrowRight } from "lucide-react-native";
import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, Image } from "react-native";
import { Button } from "../../components/ui/button";
import { Checkbox } from "../../components/ui/checkbox";
import { Separator } from "../../components/ui/separator";

export const ViewOnboarding = (): JSX.Element => {
  const [gdprAccepted, setGdprAccepted] = useState(false);

  // Progress steps data
  const progressSteps = [
    { id: "person", label: "Person", step: "1/3", active: true },
    { id: "vanner", label: "Vänner", step: "2/3", active: false },
    { id: "grupper", label: "Grupper", step: "3/3", active: false },
  ];

  // Form fields data
  const formFields = [
    [
      { label: "Förnamn", value: "Pelle" },
      { label: "Efternamn", value: "Nyman" },
    ],
    [
      { label: "Gatuadress", value: "Linnégatan..." },
      { label: "Postnummer", value: "11524" },
    ],
    [
      { label: "Stad", value: "Stockholm" },
      { label: "Epost", value: "pelle@bossma" },
    ],
    [
      { label: "Mobil", value: "0705353534" },
      { label: "Lösenord", value: "SärlekErBest123!" },
    ],
  ];

  return (
    <View style={styles.container}>
      {/* Status bar */}
      <View style={styles.statusBar}>
        <View style={styles.statusBarContent}>
          <Text style={styles.timeText}>9:30</Text>
          
          <View style={styles.statusIcons}>
            <View style={styles.signalContainer}>
              <Image
                style={styles.signalIcon}
                source={{ uri: "https://images.pexels.com/photos/1000445/pexels-photo-1000445.jpeg?auto=compress&cs=tinysrgb&w=17&h=14" }}
              />
              <Image
                style={styles.signalIcon}
                source={{ uri: "https://images.pexels.com/photos/1000445/pexels-photo-1000445.jpeg?auto=compress&cs=tinysrgb&w=17&h=17" }}
              />
            </View>
            <Image
              style={styles.batteryIcon}
              source={{ uri: "https://images.pexels.com/photos/1000445/pexels-photo-1000445.jpeg?auto=compress&cs=tinysrgb&w=8&h=15" }}
            />
          </View>

          <Image
            style={styles.cameraIcon}
            source={{ uri: "https://images.pexels.com/photos/1000445/pexels-photo-1000445.jpeg?auto=compress&cs=tinysrgb&w=24&h=24" }}
          />
        </View>
      </View>

      {/* Header with logo and menu */}
      <View style={styles.header}>
        <View style={styles.logoContainer}>
          <Image
            style={styles.logo}
            source={{ uri: "https://images.pexels.com/photos/1000445/pexels-photo-1000445.jpeg?auto=compress&cs=tinysrgb&w=120&h=55" }}
          />
        </View>

        {/* Hamburger menu */}
        <View style={styles.hamburgerMenu}>
          <View style={styles.hamburgerLine} />
          <View style={styles.hamburgerLine} />
          <View style={styles.hamburgerLine} />
        </View>
      </View>

      {/* Main content */}
      <View style={styles.mainContent}>
        <View style={styles.contentCard}>
          {/* Heading */}
          <View style={styles.headingContainer}>
            <Text style={styles.heading}>
              Först, några {'\n'}
              snabba frågor.
            </Text>
          </View>

          {/* Progress tabs */}
          <View style={styles.progressContainer}>
            <View style={styles.progressTabs}>
              {progressSteps.map((step, index) => (
                <View key={step.id} style={styles.progressStep}>
                  <Text style={[
                    styles.progressLabel,
                    step.active ? styles.progressLabelActive : styles.progressLabelInactive
                  ]}>
                    {step.label} {step.step}
                  </Text>
                  <View style={[
                    styles.progressBar,
                    step.active ? styles.progressBarActive : styles.progressBarInactive
                  ]} />
                </View>
              ))}
            </View>
          </View>

          {/* Form fields */}
          <ScrollView style={styles.formContainer}>
            <View style={styles.formFields}>
              {formFields.map((row, rowIndex) => (
                <View key={`row-${rowIndex}`} style={styles.formRow}>
                  {row.map((field, fieldIndex) => (
                    <View key={`field-${rowIndex}-${fieldIndex}`} style={styles.fieldContainer}>
                      <View style={styles.fieldLabelContainer}>
                        <Text style={styles.fieldLabel}>{field.label}</Text>
                      </View>
                      <View style={styles.fieldValueContainer}>
                        <Separator orientation="vertical" style={styles.fieldSeparator} />
                        <Text style={styles.fieldValue}>{field.value}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              ))}

              {/* GDPR Checkbox */}
              <View style={styles.gdprContainer}>
                <Checkbox
                  id="gdpr"
                  checked={gdprAccepted}
                  onCheckedChange={setGdprAccepted}
                  className={styles.gdprCheckbox}
                />
                <Text style={styles.gdprText}>
                  <Text style={styles.gdprNormalText}>Jag godkänner </Text>
                  <Text style={styles.gdprUnderlineText}>GDPR </Text>
                  <Text style={styles.gdprNormalText}>och </Text>
                  <Text style={styles.gdprUnderlineText}>integritetspolicy</Text>
                </Text>
              </View>

              {/* Submit button */}
              <Button
                variant="outline"
                onPress={() => console.log('Form submitted')}
                style={styles.submitButton}
              >
                <View style={styles.buttonContent}>
                  <Text style={styles.buttonText}>Fyll i för att gå vidare</Text>
                  <ArrowRight size={26} color="white" />
                </View>
              </Button>
            </View>
          </ScrollView>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    minHeight: '100%',
  },
  statusBar: {
    width: '100%',
  },
  statusBarContent: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 10,
    position: 'relative',
  },
  timeText: {
    fontFamily: 'Roboto',
    fontWeight: '500',
    color: '#000000',
    fontSize: 14,
    letterSpacing: 0.14,
    lineHeight: 20,
  },
  statusIcons: {
    width: 46,
    height: 17,
    position: 'relative',
  },
  signalContainer: {
    width: 33,
    height: 17,
    position: 'absolute',
    top: 0,
    left: 0,
    flexDirection: 'row',
  },
  signalIcon: {
    width: 17,
    height: 17,
    marginRight: 4,
  },
  batteryIcon: {
    width: 8,
    height: 15,
    position: 'absolute',
    top: 1,
    right: 0,
  },
  cameraIcon: {
    width: 24,
    height: 24,
    position: 'absolute',
    top: 18,
    left: '50%',
    marginLeft: -12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 25,
  },
  logoContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  logo: {
    width: 120,
    height: 55,
    resizeMode: 'cover',
  },
  hamburgerMenu: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 5,
  },
  hamburgerLine: {
    width: 22,
    height: 3,
    backgroundColor: '#001f27',
    borderRadius: 100,
  },
  mainContent: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'flex-start',
    justifyContent: 'flex-end',
    gap: 16,
    paddingTop: 16,
    paddingHorizontal: 16,
  },
  contentCard: {
    width: '100%',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 28,
    paddingTop: 20,
    paddingBottom: 24,
    paddingHorizontal: 20,
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    backgroundColor: 'transparent',
    backgroundImage: 'linear-gradient(180deg, rgba(3,193,222,1) 0%, rgba(149,0,194,1) 100%)',
  },
  headingContainer: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  heading: {
    flex: 1,
    fontFamily: 'Helvetica_Neue-Bold',
    fontWeight: 'bold',
    color: 'white',
    fontSize: 38,
    lineHeight: 40,
    marginTop: -1,
  },
  progressContainer: {
    width: '100%',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 10,
  },
  progressTabs: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  progressStep: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 4,
  },
  progressLabel: {
    fontFamily: 'Helvetica_Neue-Bold',
    fontWeight: 'bold',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 17,
    marginTop: -1,
  },
  progressLabelActive: {
    color: '#02f1e7',
  },
  progressLabelInactive: {
    color: 'white',
  },
  progressBar: {
    width: '100%',
    height: 6,
  },
  progressBarActive: {
    backgroundColor: '#02f1e7',
  },
  progressBarInactive: {
    backgroundColor: 'white',
  },
  formContainer: {
    width: '100%',
    flex: 1,
  },
  formFields: {
    width: '100%',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 20,
  },
  formRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  fieldContainer: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 10,
  },
  fieldLabelContainer: {
    width: '100%',
    flexDirection: 'column',
    alignItems: 'flex-start',
    justifyContent: 'center',
    gap: 35,
  },
  fieldLabel: {
    fontFamily: 'Helvetica_Neue-Bold',
    fontWeight: 'bold',
    color: 'white',
    fontSize: 20,
    lineHeight: 20,
    marginTop: -1,
  },
  fieldValueContainer: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  fieldSeparator: {
    width: 2,
    height: 47,
    backgroundColor: 'white',
  },
  fieldValue: {
    flex: 1,
    fontFamily: 'Helvetica_Neue-Light',
    fontWeight: '300',
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 24,
    lineHeight: 20,
    height: 20,
  },
  gdprContainer: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingTop: 16,
    paddingBottom: 32,
  },
  gdprCheckbox: {
    width: 33,
    height: 33,
    borderWidth: 2,
    borderColor: 'white',
    borderRadius: 0,
  },
  gdprText: {
    width: 348,
    height: 33,
    marginTop: -1,
    marginRight: -77,
  },
  gdprNormalText: {
    fontFamily: 'Helvetica_Neue-Light',
    fontWeight: '300',
    color: 'white',
    fontSize: 15,
    lineHeight: 25,
  },
  gdprUnderlineText: {
    fontFamily: 'Helvetica_Neue-Light',
    fontWeight: '300',
    color: 'white',
    fontSize: 15,
    lineHeight: 25,
    textDecorationLine: 'underline',
  },
  submitButton: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 56,
    borderWidth: 2,
    borderColor: 'white',
    backgroundColor: 'transparent',
    minHeight: 'auto',
  },
  buttonContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  buttonText: {
    flex: 1,
    fontFamily: 'Helvetica_Neue-Bold',
    fontWeight: 'bold',
    color: 'white',
    fontSize: 20,
    lineHeight: 20,
    textAlign: 'center',
    marginTop: -1,
  },
});

export default ViewOnboarding;